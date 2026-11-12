"use server";

import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/auth/guards";
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
 * Start a Paystack checkout for an upgrade or renewal. The plan price is read
 * from the server-side plan configuration; the browser only sends a plan key.
 */
export async function startSubscriptionPayment(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireBusiness("subscription.view");
  const tenantId = context.tenant.id;

  if (context.roleKey !== "owner") {
    return { error: "Only the business owner can manage the subscription." };
  }

  if (context.tenant.paymentExempt) {
    return {
      error:
        "This workspace is billed manually by the Madetom team, so online payment is disabled. Contact your administrator to change the plan.",
    };
  }

  const planKey = formString(formData, "planKey");
  if (!isValidPlanKey(planKey)) {
    return { error: "Choose a valid plan." };
  }

  if (!paystackConfigured()) {
    return {
      error:
        "Card payments are not configured yet. Ask the platform administrator to add the Paystack secret key.",
    };
  }

  const plan = getPlanConfig(planKey);
  const reference = createPaymentReference(tenantId);

  await createPendingPayment({
    tenantId,
    planKey: plan.key,
    reference,
    amountPesewas: plan.priceMonthly,
    currency: plan.currency,
    metadata: {
      tenantId,
      planKey: plan.key,
      initiatedBy: context.user.id,
    },
  });

  let authorizationUrl: string;
  try {
    const result = await initializeTransaction({
      email: context.tenant.email ?? context.user.email,
      amount: plan.priceMonthly,
      reference,
      callbackUrl: `${await getAppUrl()}/api/payments/paystack/callback`,
      metadata: {
        tenantId,
        planKey: plan.key,
        initiatedBy: context.user.id,
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
