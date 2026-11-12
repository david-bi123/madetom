"use server";

import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantMemberships, tenants } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { formString, type ActionState } from "@/lib/action-state";
import { getPlanConfig, isValidPlanKey } from "@/lib/subscription/plans";
import {
  createPaymentReference,
  initializeTransaction,
  paystackConfigured,
} from "@/lib/payments/paystack";
import { createPendingPayment, markPaymentFailed } from "@/lib/subscription/payments";
import { getAppUrl } from "@/lib/app-url";

/**
 * Retry checkout for a self-serve workspace whose first payment did not
 * complete. The plan key is read from the pending subscription, never trusted
 * from the browser.
 */
export async function retrySignupPayment(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const [row] = await db
    .select({ membership: tenantMemberships, tenant: tenants })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(
      and(
        eq(tenantMemberships.userId, session.user.id),
        eq(tenantMemberships.status, "active"),
      ),
    )
    .orderBy(asc(tenantMemberships.joinedAt))
    .limit(1);

  if (!row) redirect("/login?error=no-workspace");
  if (row.tenant.status === "suspended") redirect("/suspended");
  if (row.tenant.paymentExempt) {
    return { error: "This workspace is billed manually by the Madetom team, so no payment is due." };
  }
  if (row.tenant.status !== "pending") redirect("/app");

  if (row.membership.roleKey !== "owner") {
    return { error: "Only the business owner can complete the subscription payment." };
  }

  const requestedPlan = formString(formData, "planKey");
  if (requestedPlan && !isValidPlanKey(requestedPlan)) {
    return { error: "Choose a valid plan." };
  }

  if (!paystackConfigured()) {
    return {
      error:
        "Card payments are not configured yet. Contact support so we can activate your workspace.",
    };
  }

  const plan = getPlanConfig(requestedPlan || "starter");
  const tenantId = row.tenant.id;
  const reference = createPaymentReference(tenantId);

  await createPendingPayment({
    tenantId,
    planKey: plan.key,
    reference,
    amountPesewas: plan.priceMonthly,
    currency: plan.currency,
    metadata: {
      flow: "signup",
      tenantId,
      planKey: plan.key,
      initiatedBy: session.user.id,
    },
  });

  let authorizationUrl: string;
  try {
    const result = await initializeTransaction({
      email: row.tenant.email ?? session.user.email,
      amount: plan.priceMonthly,
      reference,
      callbackUrl: `${await getAppUrl()}/api/payments/paystack/callback`,
      metadata: {
        flow: "signup",
        tenantId,
        planKey: plan.key,
        initiatedBy: session.user.id,
      },
    });
    authorizationUrl = result.authorizationUrl;
  } catch (error) {
    await markPaymentFailed({
      reference,
      reason: error instanceof Error ? error.message : "Could not start Paystack checkout.",
    });
    return {
      error:
        error instanceof Error
          ? error.message
          : "The payment could not be started. Please try again.",
    };
  }

  redirect(authorizationUrl);
}
