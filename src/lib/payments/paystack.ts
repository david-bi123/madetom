/**
 * Paystack integration for Madetom subscriptions.
 *
 * The secret key is read from the server environment only. Nothing in this
 * module may be imported into a client component.
 *
 * Paystack amounts are expressed in the currency's minor unit (pesewas for
 * GHS), which is the same unit used by the plan configuration.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface PaystackTransaction {
  reference: string;
  status: "success" | "failed" | "abandoned" | "pending" | string;
  amount: number;
  currency: string;
  paid_at: string | null;
  channel?: string | null;
  customer?: { email?: string | null };
  metadata?: Record<string, unknown> | null;
  gateway_response?: string | null;
}

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

/** The live key names used in this deployment are accepted as aliases. */
function secretKeyValue(): string | null {
  return (
    process.env.PAYSTACK_SECRET_KEY?.trim() ||
    process.env.PAYSTACK_LIVE_SECRET_KEY?.trim() ||
    null
  );
}

export function paystackConfigured(): boolean {
  return Boolean(secretKeyValue());
}

function secretKey(): string {
  const key = secretKeyValue();
  if (!key) {
    throw new Error(
      "Paystack is not configured. Set PAYSTACK_SECRET_KEY (or PAYSTACK_LIVE_SECRET_KEY). Subscription payments are unavailable.",
    );
  }
  return key;
}

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  let body: PaystackResponse<T> | null = null;
  try {
    body = (await response.json()) as PaystackResponse<T>;
  } catch {
    body = null;
  }

  if (!response.ok || !body?.status) {
    const message = body?.message || `Paystack request failed (${response.status}).`;
    throw new Error(message);
  }

  return body.data;
}

export interface InitializeTransactionInput {
  email: string;
  /** Amount in pesewas. */
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export async function initializeTransaction(
  input: InitializeTransactionInput,
): Promise<{ authorizationUrl: string; accessCode: string; reference: string }> {
  const data = await paystackFetch<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: "GHS",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });

  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  };
}

export async function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  return paystackFetch<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/**
 * Verify the `x-paystack-signature` header against the raw request body. The
 * comparison is timing-safe and rejects missing configuration rather than
 * silently accepting unsigned events.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody, "utf8").digest("hex");
  const provided = signature.trim().toLowerCase();
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(provided, "utf8"));
  } catch {
    return false;
  }
}

/** Generate a unique, human-readable payment reference. */
export function createPaymentReference(tenantId: string): string {
  const tenantPart = tenantId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MAD-${tenantPart}-${Date.now().toString(36).toUpperCase()}-${random}`;
}
