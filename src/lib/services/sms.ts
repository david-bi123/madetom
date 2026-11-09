import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  smsLogs,
  smsTransactions,
  smsWallets,
} from "@/lib/db/schema";
import {
  dispatchSms,
  activeSmsProvider,
  smsConfigured,
  type SmsSendResult,
} from "./sms-providers";

const CREDITS_PER_SMS = 1;

export type SendSmsInput = {
  tenantId: string | null;
  phone: string;
  message: string;
  /** Safe version stored in the audit log (secrets redacted). */
  displayMessage?: string;
  purpose: string;
  relatedType?: string;
  relatedId?: string;
  createdBy?: string | null;
  deductCredit?: boolean;
};

export type SendSmsOutcome = {
  id: string;
  status: "sent" | "failed";
  error?: string;
  creditsUsed: number;
};

export async function ensureSmsWallet(tenantId: string, initialCredits = 0): Promise<void> {
  const [existing] = await db.select().from(smsWallets).where(eq(smsWallets.tenantId, tenantId)).limit(1);
  if (existing) return;
  await db.insert(smsWallets).values({
    id: crypto.randomUUID(),
    tenantId,
    credits: initialCredits,
  });
}

export async function getSmsWallet(tenantId: string) {
  const [wallet] = await db.select().from(smsWallets).where(eq(smsWallets.tenantId, tenantId)).limit(1);
  if (!wallet) {
    await ensureSmsWallet(tenantId, 0);
    return { id: "", tenantId, credits: 0, updatedAt: new Date() };
  }
  return wallet;
}

/**
 * Record and dispatch an SMS. Wallet credits are reserved before handing the
 * message to a provider and returned automatically if delivery is rejected.
 */
export async function sendSms(input: SendSmsInput): Promise<SendSmsOutcome> {
  const provider = activeSmsProvider();
  const shouldDeduct = Boolean(input.tenantId) && input.deductCredit !== false;
  const logId = crypto.randomUUID();

  await db.insert(smsLogs).values({
    id: logId,
    tenantId: input.tenantId,
    phone: input.phone,
    message: input.displayMessage ?? input.message,
    purpose: input.purpose,
    provider,
    status: "queued",
    creditsUsed: 0,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
  });

  if (!smsConfigured()) {
    const error = `SMS provider "${provider}" is not fully configured.`;
    await db.update(smsLogs).set({ status: "failed", error }).where(eq(smsLogs.id, logId));
    return { id: logId, status: "failed", error, creditsUsed: 0 };
  }

  let reserved = false;
  if (shouldDeduct && input.tenantId) {
    const [result] = await db.execute(
      sql`UPDATE sms_wallets SET credits = credits - ${CREDITS_PER_SMS}
          WHERE tenant_id = ${input.tenantId} AND credits >= ${CREDITS_PER_SMS}`,
    );
    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (affected === 0) {
      const error = "Insufficient SMS credits. Ask the platform administrator to top up.";
      await db.update(smsLogs).set({ status: "failed", error }).where(eq(smsLogs.id, logId));
      return { id: logId, status: "failed", error, creditsUsed: 0 };
    }
    reserved = true;
  }

  let result: SmsSendResult;
  try {
    result = await dispatchSms({
      to: input.phone,
      message: input.message,
      purpose: input.purpose,
    });
  } catch (error) {
    // A transport problem must never break the business operation that
    // triggered the message (a sale, an invitation, a stock movement).
    result = {
      ok: false,
      provider,
      error:
        error instanceof Error
          ? error.message.slice(0, 255)
          : "The SMS provider request failed.",
    };
  }

  if (result.ok) {
    if (reserved && input.tenantId) {
      await db.transaction(async (tx) => {
        const [wallet] = await tx
          .select({ credits: smsWallets.credits })
          .from(smsWallets)
          .where(eq(smsWallets.tenantId, input.tenantId!))
          .for("update");
        await tx.insert(smsTransactions).values({
          id: crypto.randomUUID(),
          tenantId: input.tenantId!,
          type: "debit",
          credits: CREDITS_PER_SMS,
          balanceAfter: wallet?.credits ?? 0,
          reference: result.providerMessageId,
          description: `SMS · ${input.purpose.replaceAll("_", " ")}`,
          createdBy: input.createdBy ?? null,
        });
      });
    }

    await db
      .update(smsLogs)
      .set({
        status: "sent",
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        sentAt: new Date(),
        creditsUsed: reserved ? CREDITS_PER_SMS : 0,
      })
      .where(eq(smsLogs.id, logId));

    return { id: logId, status: "sent", creditsUsed: reserved ? CREDITS_PER_SMS : 0 };
  }

  if (reserved && input.tenantId) {
    await db.transaction(async (tx) => {
      await tx
        .update(smsWallets)
        .set({ credits: sql`${smsWallets.credits} + ${CREDITS_PER_SMS}` })
        .where(eq(smsWallets.tenantId, input.tenantId!));
      const [wallet] = await tx
        .select({ credits: smsWallets.credits })
        .from(smsWallets)
        .where(eq(smsWallets.tenantId, input.tenantId!))
        .for("update");
      await tx.insert(smsTransactions).values({
        id: crypto.randomUUID(),
        tenantId: input.tenantId!,
        type: "credit",
        credits: CREDITS_PER_SMS,
        balanceAfter: wallet?.credits ?? 0,
        reference: logId,
        description: "SMS delivery failed — credit returned",
        createdBy: input.createdBy ?? null,
      });
    });
  }

  await db
    .update(smsLogs)
    .set({
      status: "failed",
      provider: result.provider,
      error: result.error?.slice(0, 255),
    })
    .where(eq(smsLogs.id, logId));

  return {
    id: logId,
    status: "failed",
    error: result.error ?? "The SMS provider rejected the message.",
    creditsUsed: 0,
  };
}

/** Platform administrator adjustment, atomic and fully recorded. */
export async function adjustSmsCredits(input: {
  tenantId: string;
  credits: number;
  description: string;
  actorId: string;
  actorName: string;
}): Promise<{ balance: number }> {
  if (!Number.isInteger(input.credits) || input.credits === 0) {
    throw new Error("Enter a non-zero whole number of credits.");
  }

  return db.transaction(async (tx) => {
    await ensureSmsWallet(input.tenantId, 0);
    const [wallet] = await tx
      .select()
      .from(smsWallets)
      .where(eq(smsWallets.tenantId, input.tenantId))
      .for("update");

    if (!wallet) throw new Error("SMS wallet not found.");
    const nextBalance = wallet.credits + input.credits;
    if (nextBalance < 0) throw new Error("The wallet cannot go below zero credits.");

    await tx
      .update(smsWallets)
      .set({ credits: nextBalance })
      .where(eq(smsWallets.tenantId, input.tenantId));

    await tx.insert(smsTransactions).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      type: input.credits > 0 ? "credit" : "debit",
      credits: Math.abs(input.credits),
      balanceAfter: nextBalance,
      reference: "manual-adjustment",
      description: `${input.description} · ${input.actorName}`,
      createdBy: input.actorId,
    });

    return { balance: nextBalance };
  });
}

/** Retry a failed non-secret SMS (invitations and reset codes must be regenerated). */
export async function retrySmsLog(input: {
  logId: string;
  actorId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const [log] = await db.select().from(smsLogs).where(eq(smsLogs.id, input.logId)).limit(1);
  if (!log) return { ok: false, error: "SMS log not found." };
  if (log.status !== "failed") return { ok: false, error: "Only failed messages can be retried." };
  if (["invitation", "owner_invitation", "staff_invitation", "password_reset"].includes(log.purpose)) {
    return {
      ok: false,
      error: "This message contains a secure link or code. Use resend to generate a fresh one.",
    };
  }

  await db
    .update(smsLogs)
    .set({ attempts: sql`${smsLogs.attempts} + 1` })
    .where(eq(smsLogs.id, log.id));

  const result = await sendSms({
    tenantId: log.tenantId,
    phone: log.phone,
    message: log.message,
    purpose: log.purpose,
    relatedType: log.relatedType ?? undefined,
    relatedId: log.relatedId ?? undefined,
    createdBy: input.actorId,
  });

  return result.status === "sent" ? { ok: true } : { ok: false, error: result.error };
}
