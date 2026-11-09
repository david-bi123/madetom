import { createHmac, timingSafeEqual } from "node:crypto";

type WhatsAppError = {
  code?: number;
  title?: string;
  message?: string;
};

type WhatsAppStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  pricing?: {
    billable?: boolean;
    category?: string;
    pricing_model?: string;
    type?: string;
  };
  errors?: WhatsAppError[];
};

type WhatsAppMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

type WhatsAppChangeValue = {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    profile?: { name?: string };
    wa_id?: string;
  }>;
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
  errors?: WhatsAppError[];
};

type WhatsAppWebhook = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: WhatsAppChangeValue;
    }>;
  }>;
};

function maskPhone(value: string | undefined): string {
  if (!value) return "(unknown)";
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return "***";
  return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const provided = Buffer.from(signature.slice("sha256=".length), "hex");

  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

function handleChange(field: string | undefined, value: WhatsAppChangeValue | undefined): void {
  if (field !== "messages" || !value) {
    if (field) console.info("whatsapp.webhook.ignored", { field });
    return;
  }

  const phoneNumberId = value.metadata?.phone_number_id;
  const displayNumber = maskPhone(value.metadata?.display_phone_number);

  for (const message of value.messages ?? []) {
    console.info("whatsapp.inbound", {
      phoneNumberId,
      displayNumber,
      from: maskPhone(message.from),
      type: message.type,
      messageId: message.id,
      textLength: message.text?.body?.length ?? 0,
    });
  }

  for (const status of value.statuses ?? []) {
    console.info("whatsapp.status", {
      phoneNumberId,
      displayNumber,
      messageId: status.id,
      status: status.status,
      to: maskPhone(status.recipient_id),
      category: status.pricing?.category,
      billable: status.pricing?.billable,
      pricingType: status.pricing?.type,
    });

    if (status.errors?.length) {
      console.warn("whatsapp.status.errors", {
        messageId: status.id,
        errors: status.errors.map((error) => ({
          code: error.code,
          title: error.title,
          message: error.message,
        })),
      });
    }
  }

  if (value.errors?.length) {
    console.warn("whatsapp.webhook.errors", {
      phoneNumberId,
      errors: value.errors.map((error) => ({
        code: error.code,
        title: error.title,
        message: error.message,
      })),
    });
  }
}

/**
 * Meta webhook verification.
 * Meta sends hub.mode, hub.verify_token and hub.challenge as query parameters.
 * The endpoint must return the challenge as plain text.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    return Response.json(
      { error: "WHATSAPP_VERIFY_TOKEN is not configured." },
      { status: 503 },
    );
  }

  if (mode !== "subscribe" || !challenge || token !== verifyToken) {
    return Response.json({ error: "Webhook verification failed." }, { status: 403 });
  }

  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Meta webhook delivery.
 * Every request is signed with X-Hub-Signature-256 using the Meta app secret.
 * We acknowledge quickly and keep logs free of message bodies and full numbers.
 */
export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return Response.json(
      { error: "WHATSAPP_APP_SECRET is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature, appSecret)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: WhatsAppWebhook;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhook;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account") {
    // Acknowledge unknown objects so Meta does not retry them.
    return Response.json({ received: true });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      handleChange(change.field, change.value);
    }
  }

  return Response.json({ received: true });
}
