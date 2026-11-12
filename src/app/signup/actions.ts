"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  notificationPreferences,
  smsWallets,
  subscriptionHistory,
  subscriptionPayments,
  subscriptions,
  tenantMemberships,
  tenants,
  users,
} from "@/lib/db/schema";
import { createSession, hashPassword } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/format";
import { formString, zodState, type ActionState } from "@/lib/action-state";
import { signupSchema } from "@/lib/validation/auth";
import {
  createPaymentReference,
  initializeTransaction,
  paystackConfigured,
} from "@/lib/payments/paystack";
import { markPaymentFailed } from "@/lib/subscription/payments";
import { getPlanConfig } from "@/lib/subscription/plans";
import { getAppUrl } from "@/lib/app-url";

function isDuplicateEntry(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  const errno = (error as { errno?: number }).errno;
  return code === "ER_DUP_ENTRY" || errno === 1062;
}

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

async function requestIp(): Promise<string> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Create a self-serve organisation and send the owner to Paystack.
 *
 * Nothing is activated here. The workspace is created with the `pending` status
 * and a `pending_payment` subscription, and only the verified Paystack callback
 * or webhook can activate it (see applySuccessfulPayment).
 */
export async function signupAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await requestIp();
  const limit = await consumeRateLimit(`signup:${ip}`, 6, 15 * 60);
  if (!limit.allowed) {
    return { error: "Too many sign-up attempts. Wait 15 minutes and try again." };
  }

  const parsed = signupSchema.safeParse({
    name: formString(formData, "name"),
    email: formString(formData, "email").toLowerCase(),
    phone: formString(formData, "phone"),
    password: formString(formData, "password", false),
    confirmPassword: formString(formData, "confirmPassword", false),
    businessName: formString(formData, "businessName"),
    businessType: formString(formData, "businessType"),
    region: formString(formData, "region"),
    location: formString(formData, "location"),
    branchName: formString(formData, "branchName"),
    planKey: formString(formData, "planKey"),
    acceptTerms: formData.get("acceptTerms") === "true",
  });
  if (!parsed.success) return zodState(parsed.error);

  if (!paystackConfigured()) {
    return {
      error:
        "Self-serve sign-up is temporarily unavailable because card payments are not configured. Contact support to create your organisation.",
    };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const phone = normalizePhone(data.phone);

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingEmail) {
    return {
      error:
        "An account with this email already exists. Sign in to continue, or use a different email address.",
    };
  }

  const [existingPhone] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  if (existingPhone) {
    return {
      error:
        "An account with this phone number already exists. Sign in to continue, or use a different number.",
    };
  }

  const plan = getPlanConfig(data.planKey);
  const passwordHash = await hashPassword(data.password);
  const userId = crypto.randomUUID();
  const tenantId = crypto.randomUUID();
  const branchId = crypto.randomUUID();
  const now = new Date();
  const reference = createPaymentReference(tenantId);

  const baseSlug = slugifyBusiness(data.businessName);
  let slug = baseSlug;
  for (let attempt = 2; attempt < 100; attempt += 1) {
    const [taken] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (!taken) break;
    slug = `${baseSlug}-${attempt}`;
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(tenants).values({
        id: tenantId,
        name: data.businessName,
        slug,
        businessType: data.businessType,
        country: "Ghana",
        region: data.region,
        location: data.location,
        phone,
        email,
        currency: "GHS",
        status: "pending",
        onboardingCompletedAt: now,
        createdBy: userId,
      });

      await tx.insert(branches).values({
        id: branchId,
        tenantId,
        name: data.branchName,
        code: "MAIN",
        isDefault: true,
      });

      await tx.insert(users).values({
        id: userId,
        name: data.name,
        email,
        phone,
        passwordHash,
        status: "active",
      });

      await tx.insert(tenantMemberships).values({
        id: crypto.randomUUID(),
        tenantId,
        userId,
        roleKey: "owner",
        defaultBranchId: branchId,
        status: "active",
      });

      await tx.insert(notificationPreferences).values({
        id: crypto.randomUUID(),
        tenantId,
        userId,
        lowStock: true,
        outOfStock: true,
        dailySummary: true,
        stockAdjustments: true,
        smsStockAdjustment: false,
      });

      await tx.insert(smsWallets).values({
        id: crypto.randomUUID(),
        tenantId,
        credits: 0,
      });

      await tx.insert(subscriptions).values({
        id: crypto.randomUUID(),
        tenantId,
        planKey: plan.key,
        status: "pending_payment",
        billingCycle: "monthly",
        billingAmount: (plan.priceMonthly / 100).toFixed(2),
        currency: plan.currency,
        currentPeriodStart: now,
        currentPeriodEnd: null,
        notes: "Awaiting the first verified Paystack payment.",
      });

      await tx.insert(subscriptionHistory).values({
        id: crypto.randomUUID(),
        tenantId,
        planKey: plan.key,
        previousPlanKey: null,
        previousStatus: null,
        status: "pending_payment",
        action: "created",
        billingAmount: (plan.priceMonthly / 100).toFixed(2),
        currency: plan.currency,
        effectiveAt: now,
        periodEnd: null,
        actorUserId: userId,
        actorName: data.name,
        notes: "Self-serve organisation created. Awaiting the first payment.",
      });

      await tx.insert(subscriptionPayments).values({
        id: crypto.randomUUID(),
        tenantId,
        planKey: plan.key,
        provider: "paystack",
        reference,
        amount: (plan.priceMonthly / 100).toFixed(2),
        currency: plan.currency,
        status: "pending",
        metadata: {
          flow: "signup",
          tenantId,
          planKey: plan.key,
          initiatedBy: userId,
        },
      });
    });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return {
        error:
          "An account or workspace with these details already exists. Sign in to continue, or use different details.",
      };
    }
    console.error("signup_failed", error);
    return {
      error: "We could not create your workspace. Nothing was charged. Please try again.",
    };
  }

  // The owner is signed in before checkout so the verified callback can return
  // them straight into the workspace. The pending tenant guard blocks the app
  // until the payment activates the subscription.
  await createSession(userId);

  await writeAudit({
    tenantId,
    actorUserId: userId,
    actorName: data.name,
    action: "auth.signup",
    entityType: "tenant",
    entityId: tenantId,
    summary: `Created ${data.businessName} on the ${plan.name} plan and started checkout`,
  });

  let authorizationUrl: string;
  try {
    const result = await initializeTransaction({
      email,
      amount: plan.priceMonthly,
      reference,
      callbackUrl: `${await getAppUrl()}/api/payments/paystack/callback`,
      metadata: {
        flow: "signup",
        tenantId,
        planKey: plan.key,
        initiatedBy: userId,
      },
    });
    authorizationUrl = result.authorizationUrl;
  } catch (error) {
    await markPaymentFailed({
      reference,
      reason: error instanceof Error ? error.message : "Could not start Paystack checkout.",
    });
    console.error("signup_checkout_failed", error);
    redirect("/pending-payment?checkout=failed");
  }

  redirect(authorizationUrl);
}
