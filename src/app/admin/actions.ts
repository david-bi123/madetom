"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  branches,
  invitations,
  platformSettings,
  smsWallets,
  subscriptionHistory,
  subscriptions,
  tenants,
  users,
} from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { createSecureToken, hashToken } from "@/lib/auth/session";
import { sendSms, adjustSmsCredits } from "@/lib/services/sms";
import { resendOwnerInvitation } from "@/lib/services/invitations";
import { getAppUrl } from "@/lib/app-url";
import { normalizePhone } from "@/lib/format";
import { zodState, formString, type ActionState } from "@/lib/action-state";
import { emailSchema, phoneSchema } from "@/lib/validation/auth";
import { runPlatformDailyReport } from "@/lib/services/notifications";
import {
  formatPlanPrice,
  getPlanConfig,
  isValidPlanKey,
} from "@/lib/subscription/plans";

const organisationSchema = z.object({
  businessName: z.string().trim().min(2, "Enter the business name.").max(160),
  businessType: z.string().trim().min(2, "Enter the business type.").max(80),
  ownerName: z.string().trim().min(2, "Enter the owner's full name.").max(120),
  ownerPhone: phoneSchema,
  ownerEmail: emailSchema,
  branchName: z.string().trim().min(2, "Name the first branch.").max(120),
  planKey: z.string().refine((k) => ["starter", "growth", "business"].includes(k), {
    message: "Select a valid subscription plan.",
  }),
});

function slugifyBusiness(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .slice(0, 70) || `org-${Date.now().toString(36)}`
  );
}

export async function createOrganisation(state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();

  const parsed = organisationSchema.safeParse({
    businessName: formString(formData, "businessName"),
    businessType: formString(formData, "businessType"),
    ownerName: formString(formData, "ownerName"),
    ownerPhone: formString(formData, "ownerPhone"),
    ownerEmail: formString(formData, "ownerEmail").toLowerCase(),
    branchName: formString(formData, "branchName"),
    planKey: formString(formData, "planKey"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const values = parsed.data;

  // Organisations created by the platform team can be excluded from online
  // payment. They keep the plan but are billed manually.
  const paymentExempt = formData.get("paymentExempt") === "true";

  const planConfig = getPlanConfig(values.planKey);

  const baseSlug = slugifyBusiness(values.businessName);
  let slug = baseSlug;
  for (let attempt = 2; attempt < 100; attempt += 1) {
    const [existing] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!existing) break;
    slug = `${baseSlug}-${attempt}`;
  }

  const tenantId = crypto.randomUUID();
  const branchId = crypto.randomUUID();
  const rawToken = createSecureToken();
  const expiresAt = new Date(Date.now() + 14 * 86400000);

  await db.transaction(async (tx) => {
    await tx.insert(tenants).values({
      id: tenantId,
      name: values.businessName,
      slug,
      businessType: values.businessType,
      country: "Ghana",
      phone: normalizePhone(values.ownerPhone),
      email: values.ownerEmail,
      currency: "GHS",
      status: "pending",
      paymentExempt,
      createdBy: admin.id,
    });

    await tx.insert(branches).values({
      id: branchId,
      tenantId,
      name: values.branchName,
      code: "MAIN",
      isDefault: true,
    });

    await tx.insert(invitations).values({
      id: crypto.randomUUID(),
      tenantId,
      type: "owner",
      name: values.ownerName,
      email: values.ownerEmail,
      phone: normalizePhone(values.ownerPhone),
      roleKey: "owner",
      branchId,
      tokenHash: hashToken(rawToken),
      status: "pending",
      deliveryStatus: "pending",
      expiresAt,
      createdBy: admin.id,
    });

    await tx.insert(smsWallets).values({
      id: crypto.randomUUID(),
      tenantId,
      credits: planConfig.smsCredits,
    });

    await tx.insert(subscriptions).values({
      id: crypto.randomUUID(),
      tenantId,
      planKey: planConfig.key,
      status: "active",
      billingCycle: "monthly",
      billingAmount: paymentExempt ? "0.00" : (planConfig.priceMonthly / 100).toFixed(2),
      currency: planConfig.currency,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialEndsAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await tx.insert(subscriptionHistory).values({
      id: crypto.randomUUID(),
      tenantId,
      planKey: planConfig.key,
      previousPlanKey: null,
      previousStatus: null,
      status: "active",
      action: "created",
      billingAmount: paymentExempt ? "0.00" : (planConfig.priceMonthly / 100).toFixed(2),
      currency: planConfig.currency,
      effectiveAt: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      actorUserId: admin.id,
      actorName: admin.name,
      notes: paymentExempt
        ? "Subscription created with the organisation. Excluded from online payment — billed manually."
        : "Subscription created with the organisation.",
    });
  });

  const link = `${await getAppUrl()}/setup/${rawToken}`;
  const sms = await sendSms({
    tenantId,
    phone: normalizePhone(values.ownerPhone),
    message: `Welcome to Madetom, ${values.ownerName}. Set up ${values.businessName} here: ${link} The link expires in 14 days.`,
    displayMessage: `Welcome to Madetom, ${values.ownerName}. Set up ${values.businessName} with the secure link. It expires in 14 days.`,
    purpose: "owner_invitation",
    relatedType: "invitation",
    createdBy: admin.id,
  });

  await db
    .update(invitations)
    .set({
      deliveryStatus: sms.status === "sent" ? "sent" : "failed",
      lastSentAt: new Date(),
      sendCount: 1,
    })
    .where(
      and(
        eq(invitations.tenantId, tenantId),
        eq(invitations.type, "owner"),
        eq(invitations.status, "pending"),
      ),
    );

  await writeAudit({
    tenantId,
    actorUserId: admin.id,
    actorName: admin.name,
    action: "org.created",
    entityType: "tenant",
    entityId: tenantId,
    summary: `Created organisation ${values.businessName} and invited ${values.ownerName}`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organisations");

  if (sms.status !== "sent") {
    return {
      error:
        sms.error ??
        "The organisation was created, but the invitation SMS could not be sent. Top up the SMS wallet and resend.",
    };
  }
  return { success: `${values.businessName} created and the owner has been invited.` };
}

export async function setTenantStatus(formData: FormData): Promise<void> {
  const admin = await requireSuperAdmin();
  const tenantId = formString(formData, "tenantId");
  const status = formString(formData, "status");
  if (!tenantId || !["active", "suspended"].includes(status)) return;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return;

  await db
    .update(tenants)
    .set({
      status: status as "active" | "suspended",
      suspendedReason: status === "suspended" ? formString(formData, "reason") || null : null,
    })
    .where(eq(tenants.id, tenantId));

  await writeAudit({
    tenantId,
    actorUserId: admin.id,
    actorName: admin.name,
    action: status === "suspended" ? "org.suspended" : "org.activated",
    entityType: "tenant",
    entityId: tenantId,
    summary: `${tenant.name} ${status === "suspended" ? "suspended" : "reactivated"}`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organisations");
  revalidatePath(`/admin/organisations/${tenantId}`);
}

/**
 * Send a fresh setup link for a pending invitation. The old link stops
 * working because its token is replaced.
 */
export async function resendInvitation(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const invitationId = formString(formData, "invitationId");
  if (!invitationId) return { error: "The invitation is missing." };

  const result = await resendOwnerInvitation({
    invitationId,
    appUrl: await getAppUrl(),
    actorId: admin.id,
    actorName: admin.name,
  });

  revalidatePath("/admin/invitations");
  revalidatePath("/admin/organisations");

  if (!result.ok) return { error: result.error ?? "The invitation could not be sent." };

  return {
    success: `A new setup link was sent by SMS. It is valid until ${result.expiresAt?.toLocaleDateString("en-GB")}.`,
  };
}

/**
 * Include or exclude an organisation from online payment. Exempt organisations
 * keep their plan but cannot start a Paystack checkout — they are billed
 * manually by the platform team.
 */
export async function setPaymentExemption(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const tenantId = formString(formData, "tenantId");
  const exempt = formString(formData, "exempt") === "true";
  if (!tenantId) return { error: "Organisation is missing." };

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return { error: "Organisation not found." };

  await db
    .update(tenants)
    .set({ paymentExempt: exempt, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1);

  if (subscription) {
    await db
      .update(subscriptions)
      .set({
        billingAmount: exempt ? "0.00" : subscription.billingAmount === "0.00"
          ? (getPlanConfig(subscription.planKey).priceMonthly / 100).toFixed(2)
          : subscription.billingAmount,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.tenantId, tenantId));
  }

  await writeAudit({
    tenantId,
    actorUserId: admin.id,
    actorName: admin.name,
    action: exempt ? "subscription.payment_exempted" : "subscription.payment_enabled",
    entityType: "tenant",
    entityId: tenantId,
    summary: exempt
      ? "Organisation excluded from online payment — billed manually"
      : "Organisation returned to online Paystack billing",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organisations");
  revalidatePath(`/admin/organisations/${tenantId}`);
  revalidatePath("/admin/subscriptions");

  return {
    success: exempt
      ? `${tenant.name} is now excluded from online payment.`
      : `${tenant.name} can now pay for plans online.`,
  };
}

export async function revokeInvitation(formData: FormData): Promise<void> {
  const admin = await requireSuperAdmin();
  const invitationId = formString(formData, "invitationId");
  if (!invitationId) return;

  const [invitation] = await db.select().from(invitations).where(eq(invitations.id, invitationId)).limit(1);
  if (!invitation || invitation.status !== "pending") return;

  await db
    .update(invitations)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(invitations.id, invitationId));

  await writeAudit({
    tenantId: invitation.tenantId,
    actorUserId: admin.id,
    actorName: admin.name,
    action: "invitation.revoked",
    entityType: "invitation",
    entityId: invitationId,
    summary: `Revoked invitation for ${invitation.name}`,
  });

  revalidatePath("/admin/invitations");
}

export async function creditSmsWallet(state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const tenantId = formString(formData, "tenantId");
  const credits = Number(formString(formData, "credits"));
  const description = formString(formData, "description");

  if (!tenantId) return { error: "Choose the organisation." };
  if (!Number.isInteger(credits) || credits === 0) return { error: "Enter a non-zero whole number of credits." };
  if (!description) return { error: "Add a short reason for this adjustment." };

  try {
    const result = await adjustSmsCredits({
      tenantId,
      credits,
      description,
      actorId: admin.id,
      actorName: admin.name,
    });

    await writeAudit({
      tenantId,
      actorUserId: admin.id,
      actorName: admin.name,
      action: "sms.credits_adjusted",
      entityType: "sms_wallet",
      entityId: tenantId,
      summary: `${credits > 0 ? "Added" : "Removed"} ${Math.abs(credits)} SMS credits · ${description}`,
      metadata: { balance: result.balance },
    });

    revalidatePath("/admin/sms");
    return { success: `Wallet updated. Balance is now ${result.balance} credits.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The credits could not be adjusted." };
  }
}

export async function updatePlatformSetting(state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const key = formString(formData, "key");
  const value = formString(formData, "value");
  if (!key) return { error: "The setting key is missing." };

  let parsedValue: unknown = value;
  try {
    parsedValue = value ? JSON.parse(value) : null;
  } catch {
    parsedValue = value;
  }

  await db
    .insert(platformSettings)
    .values({ key, value: parsedValue, updatedBy: admin.id })
    .onDuplicateKeyUpdate({ set: { value: parsedValue, updatedBy: admin.id } });

  await writeAudit({
    actorUserId: admin.id,
    actorName: admin.name,
    action: "platform.setting_updated",
    entityType: "platform_setting",
    entityId: key,
    summary: `Platform setting ${key} updated`,
  });

  revalidatePath("/admin/settings");
  return { success: "Setting saved." };
}

export async function sendPlatformReport(): Promise<{
  ok: boolean;
  error?: string;
  report?: Awaited<ReturnType<typeof runPlatformDailyReport>>;
}> {
  const [superAdmin] = await db
    .select({ id: users.id, phone: users.phone, name: users.name })
    .from(users)
    .where(eq(users.isSuperAdmin, true))
    .limit(1);

  if (!superAdmin) {
    return { ok: false, error: "No super admin account found." };
  }

  if (!superAdmin.phone) {
    return { ok: false, error: "The super admin account has no phone number on file." };
  }

  try {
    const result = await runPlatformDailyReport();
    return { ok: true, report: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Report failed to send." };
  }
}

export async function changeOrganisationPlan(state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const tenantId = formString(formData, "tenantId");
  const newPlanKey = formString(formData, "planKey");

  if (!tenantId) return { error: "Organisation is missing." };
  if (!isValidPlanKey(newPlanKey)) return { error: "Select a valid plan." };

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return { error: "Organisation not found." };

  const newPlan = getPlanConfig(newPlanKey);
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 86400000);
  // Organisations excluded from online payment are billed manually, so the
  // stored billing amount stays at zero.
  const billingAmount = tenant.paymentExempt ? "0.00" : (newPlan.priceMonthly / 100).toFixed(2);

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .for("update")
      .limit(1);

    const previousPlanKey = existing?.planKey ?? null;
    const previousStatus = existing?.status ?? null;

    if (existing) {
      await tx
        .update(subscriptions)
        .set({
          planKey: newPlanKey,
          billingAmount,
          currency: newPlan.currency,
          paymentReference: null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.tenantId, tenantId));
    } else {
      await tx.insert(subscriptions).values({
        id: crypto.randomUUID(),
        tenantId,
        planKey: newPlanKey,
        status: "active",
        billingCycle: "monthly",
        billingAmount,
        currency: newPlan.currency,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx.insert(subscriptionHistory).values({
      id: crypto.randomUUID(),
      tenantId,
      planKey: newPlanKey,
      previousPlanKey,
      previousStatus,
      status: existing?.status ?? "active",
      action: previousPlanKey === newPlanKey ? "plan_renewed" : "plan_changed",
      billingAmount,
      currency: newPlan.currency,
      effectiveAt: now,
      periodEnd,
      actorUserId: admin.id,
      actorName: admin.name,
      notes:
        previousPlanKey === newPlanKey
          ? `Plan renewed for another 30 days on ${newPlan.name}.`
          : `Plan changed from ${previousPlanKey ?? "none"} to ${newPlan.name}.`,
    });

    return { previousPlanKey, previousStatus };
  });

  await writeAudit({
    tenantId,
    actorUserId: admin.id,
    actorName: admin.name,
    action: "subscription.plan_changed",
    entityType: "subscription",
    entityId: tenantId,
    summary: `Changed plan from ${result.previousPlanKey ?? "none"} to ${newPlan.name} (${formatPlanPrice(
      newPlan.priceMonthly,
    )}/month)`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organisations");
  revalidatePath(`/admin/organisations/${tenantId}`);
  revalidatePath("/admin/subscriptions");
  revalidatePath("/app/subscription");

  return {
    success: `${tenant.name} is now on the ${newPlan.name} plan (${formatPlanPrice(
      newPlan.priceMonthly,
    )}/month). Existing records were preserved.`,
  };
}

export async function setSubscriptionStatus(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const tenantId = formString(formData, "tenantId");
  const status = formString(formData, "status");
  const reason = formString(formData, "reason", false);

  if (!tenantId) return { error: "Organisation is missing." };
  if (!["active", "past_due", "suspended", "expired", "cancelled"].includes(status)) {
    return { error: "Select a valid subscription status." };
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return { error: "Organisation not found." };

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .for("update")
      .limit(1);
    if (!existing) return null;

    const now = new Date();
    const suspendedAt = status === "suspended" ? now : null;
    const cancelledAt = status === "cancelled" ? now : null;

    await tx
      .update(subscriptions)
      .set({
        status: status as typeof existing.status,
        suspendedAt,
        cancelledAt: cancelledAt ?? existing.cancelledAt,
        notes: reason || existing.notes,
        updatedAt: now,
      })
      .where(eq(subscriptions.tenantId, tenantId));

    await tx.insert(subscriptionHistory).values({
      id: crypto.randomUUID(),
      tenantId,
      planKey: existing.planKey,
      previousPlanKey: existing.planKey,
      previousStatus: existing.status,
      status,
      action: "status_changed",
      billingAmount: existing.billingAmount,
      currency: existing.currency,
      effectiveAt: now,
      periodEnd: existing.currentPeriodEnd,
      actorUserId: admin.id,
      actorName: admin.name,
      notes: reason || `Subscription marked ${status}.`,
    });

    return existing;
  });

  if (!result) return { error: "This organisation has no subscription to update." };

  await writeAudit({
    tenantId,
    actorUserId: admin.id,
    actorName: admin.name,
    action: `subscription.${status}`,
    entityType: "subscription",
    entityId: tenantId,
    summary: `Subscription set to ${status}${reason ? ` · ${reason}` : ""}`,
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/organisations/${tenantId}`);
  revalidatePath("/admin/subscriptions");
  revalidatePath("/app/subscription");

  return { success: `Subscription for ${tenant.name} is now ${status.replaceAll("_", " ")}.` };
}

export async function extendSubscription(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const tenantId = formString(formData, "tenantId");
  const days = Number(formString(formData, "days") || "30");

  if (!tenantId) return { error: "Organisation is missing." };
  if (!Number.isInteger(days) || days < 1 || days > 366) {
    return { error: "Enter between 1 and 366 days." };
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return { error: "Organisation not found." };

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .for("update")
      .limit(1);
    if (!existing) return null;

    const now = new Date();
    const base =
      existing.currentPeriodEnd && existing.currentPeriodEnd > now
        ? existing.currentPeriodEnd
        : now;
    const newEnd = new Date(base.getTime() + days * 86400000);

    await tx
      .update(subscriptions)
      .set({
        status: "active",
        currentPeriodEnd: newEnd,
        suspendedAt: null,
        cancelledAt: null,
        updatedAt: now,
      })
      .where(eq(subscriptions.tenantId, tenantId));

    await tx.insert(subscriptionHistory).values({
      id: crypto.randomUUID(),
      tenantId,
      planKey: existing.planKey,
      previousPlanKey: existing.planKey,
      previousStatus: existing.status,
      status: "active",
      action: "extended",
      billingAmount: existing.billingAmount,
      currency: existing.currency,
      effectiveAt: now,
      periodEnd: newEnd,
      actorUserId: admin.id,
      actorName: admin.name,
      notes: `Renewal extended by ${days} day${days === 1 ? "" : "s"}.`,
    });

    return { newEnd };
  });

  if (!result) return { error: "This organisation has no subscription to extend." };

  await writeAudit({
    tenantId,
    actorUserId: admin.id,
    actorName: admin.name,
    action: "subscription.extended",
    entityType: "subscription",
    entityId: tenantId,
    summary: `Extended subscription by ${days} days to ${result.newEnd.toISOString().slice(0, 10)}`,
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/organisations/${tenantId}`);
  revalidatePath("/admin/subscriptions");
  revalidatePath("/app/subscription");

  return {
    success: `${tenant.name} renewed until ${result.newEnd.toLocaleDateString("en-GB")}.`,
  };
}

