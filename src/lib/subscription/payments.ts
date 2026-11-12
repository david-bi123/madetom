/**
 * Subscription payment records and activation.
 *
 * A payment is only ever activated after Paystack has verified it server-side
 * and the amount/currency match the plan. The unique reference is the
 * idempotency key, so duplicate callbacks and webhook retries cannot extend a
 * subscription twice.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  smsTransactions,
  smsWallets,
  subscriptionHistory,
  subscriptionPayments,
  subscriptions,
  tenants,
} from "@/lib/db/schema";
import { getPlanConfig, type PlanKey } from "@/lib/subscription/plans";
import { writeAudit } from "@/lib/audit";

const PERIOD_DAYS = 30;

export async function createPendingPayment(input: {
  tenantId: string;
  planKey: PlanKey;
  reference: string;
  amountPesewas: number;
  currency: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(subscriptionPayments).values({
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    planKey: input.planKey,
    provider: "paystack",
    reference: input.reference,
    amount: (input.amountPesewas / 100).toFixed(2),
    currency: input.currency,
    status: "pending",
    metadata: input.metadata ?? null,
  });
}

export async function markPaymentFailed(input: {
  reference: string;
  reason?: string | null;
}): Promise<void> {
  await db
    .update(subscriptionPayments)
    .set({ status: "failed", failureReason: input.reason?.slice(0, 255) ?? null })
    .where(eq(subscriptionPayments.reference, input.reference));
}

export interface ApplyPaymentInput {
  reference: string;
  providerReference?: string | null;
  /** Amount received from the provider, in pesewas. */
  amountPesewas: number;
  currency: string;
  paidAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}

export interface ApplyPaymentResult {
  ok: boolean;
  alreadyProcessed?: boolean;
  error?: string;
  tenantId?: string;
  planKey?: PlanKey;
  periodEnd?: Date;
}

/**
 * Activate a verified payment. Safe to call multiple times for the same
 * reference.
 */
export async function applySuccessfulPayment(input: ApplyPaymentInput): Promise<ApplyPaymentResult> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.reference, input.reference))
      .for("update")
      .limit(1);

    if (!payment) {
      return { ok: false, error: "Unknown payment reference." };
    }

    if (payment.status === "success") {
      return {
        ok: true,
        alreadyProcessed: true,
        tenantId: payment.tenantId,
        planKey: payment.planKey as PlanKey,
      };
    }

    const plan = getPlanConfig(payment.planKey);
    const expectedPesewas = Math.round(Number(payment.amount) * 100);

    if (input.amountPesewas !== expectedPesewas) {
      await tx
        .update(subscriptionPayments)
        .set({
          status: "failed",
          failureReason: `Amount mismatch: expected ${expectedPesewas}, received ${input.amountPesewas}.`,
        })
        .where(eq(subscriptionPayments.id, payment.id));
      return { ok: false, error: "The amount paid does not match the plan price." };
    }

    if (input.currency && input.currency.toUpperCase() !== payment.currency.toUpperCase()) {
      await tx
        .update(subscriptionPayments)
        .set({
          status: "failed",
          failureReason: `Currency mismatch: expected ${payment.currency}, received ${input.currency}.`,
        })
        .where(eq(subscriptionPayments.id, payment.id));
      return { ok: false, error: "The payment currency does not match the plan currency." };
    }

    const now = new Date();
    const paidAt = input.paidAt ?? now;

    await tx
      .update(subscriptionPayments)
      .set({
        status: "success",
        providerReference: input.providerReference ?? input.reference,
        paidAt,
        metadata: input.metadata ?? payment.metadata ?? null,
        failureReason: null,
      })
      .where(eq(subscriptionPayments.id, payment.id));

    const [existing] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, payment.tenantId))
      .for("update")
      .limit(1);

    // A self-serve signup stays `pending` until the first verified payment.
    // Activating here means an abandoned or failed payment never grants access.
    const [tenant] = await tx
      .select()
      .from(tenants)
      .where(eq(tenants.id, payment.tenantId))
      .for("update")
      .limit(1);
    const wasPendingTenant = tenant?.status === "pending";

    const base =
      existing?.currentPeriodEnd && existing.currentPeriodEnd > now
        ? existing.currentPeriodEnd
        : now;
    const periodEnd = new Date(base.getTime() + PERIOD_DAYS * 86400000);
    const previousPlanKey = existing?.planKey ?? null;
    const previousStatus = existing?.status ?? null;

    if (existing) {
      await tx
        .update(subscriptions)
        .set({
          planKey: plan.key,
          status: "active",
          billingCycle: "monthly",
          billingAmount: (plan.priceMonthly / 100).toFixed(2),
          currency: plan.currency,
          paymentReference: input.reference,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          suspendedAt: null,
          cancelledAt: null,
          updatedAt: now,
        })
        .where(eq(subscriptions.tenantId, payment.tenantId));
    } else {
      await tx.insert(subscriptions).values({
        id: crypto.randomUUID(),
        tenantId: payment.tenantId,
        planKey: plan.key,
        status: "active",
        billingCycle: "monthly",
        billingAmount: (plan.priceMonthly / 100).toFixed(2),
        currency: plan.currency,
        paymentReference: input.reference,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx.insert(subscriptionHistory).values({
      id: crypto.randomUUID(),
      tenantId: payment.tenantId,
      planKey: plan.key,
      previousPlanKey,
      previousStatus,
      status: "active",
      action: wasPendingTenant
        ? "activated"
        : previousPlanKey === plan.key
          ? "renewed"
          : "plan_changed",
      billingAmount: (plan.priceMonthly / 100).toFixed(2),
      currency: plan.currency,
      effectiveAt: now,
      periodEnd,
      actorUserId: null,
      actorName: "Paystack",
      notes: wasPendingTenant
        ? `Workspace activated by the first verified payment ${input.reference}.`
        : previousPlanKey === plan.key
          ? `Subscription renewed by Paystack payment ${input.reference}.`
          : `Plan changed to ${plan.name} by Paystack payment ${input.reference}.`,
    });

    if (tenant && wasPendingTenant) {
      await tx
        .update(tenants)
        .set({
          status: "active",
          onboardingCompletedAt: tenant.onboardingCompletedAt ?? now,
          suspendedReason: null,
        })
        .where(eq(tenants.id, tenant.id));

      // Grant the plan's included SMS credits once, on first activation.
      const [wallet] = await tx
        .select()
        .from(smsWallets)
        .where(eq(smsWallets.tenantId, tenant.id))
        .for("update")
        .limit(1);

      if (wallet && plan.smsCredits > 0) {
        const balanceAfter = wallet.credits + plan.smsCredits;
        await tx
          .update(smsWallets)
          .set({ credits: balanceAfter, updatedAt: now })
          .where(eq(smsWallets.id, wallet.id));
        await tx.insert(smsTransactions).values({
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          type: "credit",
          credits: plan.smsCredits,
          balanceAfter,
          reference: `signup-${input.reference}`,
          description: `Included SMS credits · ${plan.name}`,
          createdBy: null,
        });
      }
    }

    await writeAudit(
      {
        tenantId: payment.tenantId,
        actorUserId: null,
        actorName: "Paystack",
        action: "subscription.payment_received",
        entityType: "subscription",
        entityId: payment.tenantId,
        summary: `Payment ${input.reference} activated ${plan.name} until ${periodEnd.toISOString().slice(0, 10)}`,
        metadata: {
          reference: input.reference,
          amount: payment.amount,
          currency: payment.currency,
        },
      },
      // Use the payment transaction so the audit row commits atomically and
      // does not contend with the tenant row locked above.
      tx,
    );

    return {
      ok: true,
      tenantId: payment.tenantId,
      planKey: plan.key,
      periodEnd,
    };
  });
}
