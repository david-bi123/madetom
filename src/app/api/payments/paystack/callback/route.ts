import { NextResponse } from "next/server";
import { paystackConfigured, verifyTransaction } from "@/lib/payments/paystack";
import { applySuccessfulPayment, markPaymentFailed } from "@/lib/subscription/payments";

/**
 * Paystack redirects the customer here after checkout. The reference is always
 * re-verified with Paystack before any subscription is changed.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") ?? url.searchParams.get("trxref");

  const redirectTo = (result: string, flow?: string | null) =>
    NextResponse.redirect(
      new URL(
        flow === "signup" && result !== "success"
          ? `/pending-payment?payment=${result}`
          : `/app/subscription?payment=${result}`,
        url.origin,
      ),
    );

  if (!reference) return redirectTo("missing");
  if (!paystackConfigured()) return redirectTo("unconfigured");

  try {
    const transaction = await verifyTransaction(reference);
    const flow =
      typeof transaction.metadata?.flow === "string" ? transaction.metadata.flow : null;

    if (transaction.status !== "success") {
      await markPaymentFailed({
        reference,
        reason: transaction.gateway_response ?? `Paystack status: ${transaction.status}`,
      });
      return redirectTo("failed", flow);
    }

    const result = await applySuccessfulPayment({
      reference,
      providerReference: transaction.reference,
      amountPesewas: transaction.amount,
      currency: transaction.currency,
      paidAt: transaction.paid_at ? new Date(transaction.paid_at) : null,
      metadata: transaction.metadata ?? null,
    });

    return redirectTo(result.ok ? "success" : "failed", flow);
  } catch (error) {
    console.error("paystack_callback_failed", error);
    return redirectTo("failed");
  }
}
