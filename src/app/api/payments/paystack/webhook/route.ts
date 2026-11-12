import { NextResponse } from "next/server";
import {
  paystackConfigured,
  verifyTransaction,
  verifyWebhookSignature,
} from "@/lib/payments/paystack";
import { applySuccessfulPayment, markPaymentFailed } from "@/lib/subscription/payments";

interface PaystackWebhookEvent {
  event?: string;
  data?: {
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    paid_at?: string | null;
    metadata?: Record<string, unknown> | null;
    gateway_response?: string | null;
  };
}

/**
 * Paystack webhook. The raw body is verified with HMAC SHA-512 before parsing.
 * Successful charges are re-verified with Paystack and applied idempotently.
 */
export async function POST(request: Request) {
  if (!paystackConfigured()) {
    return NextResponse.json({ error: "Paystack is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const reference = event.data?.reference;
  if (!reference) {
    // Acknowledge so Paystack does not keep retrying an event we cannot use.
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    if (event.event === "charge.success") {
      // Never trust the webhook amount alone: re-verify with Paystack.
      const transaction = await verifyTransaction(reference);
      if (transaction.status !== "success") {
        await markPaymentFailed({
          reference,
          reason: transaction.gateway_response ?? `Paystack status: ${transaction.status}`,
        });
        return NextResponse.json({ ok: true, processed: false });
      }

      const result = await applySuccessfulPayment({
        reference,
        providerReference: transaction.reference,
        amountPesewas: transaction.amount,
        currency: transaction.currency,
        paidAt: transaction.paid_at ? new Date(transaction.paid_at) : null,
        metadata: transaction.metadata ?? null,
      });

      return NextResponse.json({ ok: true, processed: result.ok, duplicate: result.alreadyProcessed ?? false });
    }

    if (event.event === "charge.failed") {
      await markPaymentFailed({
        reference,
        reason: event.data?.gateway_response ?? "Paystack reported a failed charge.",
      });
      return NextResponse.json({ ok: true, processed: false });
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (error) {
    console.error("paystack_webhook_failed", error);
    // Return 500 so Paystack retries; the unique reference keeps it idempotent.
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
