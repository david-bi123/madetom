import { normalizePhone } from "@/lib/format";

export type SmsSendResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  provider: string;
};

type SmsMessage = {
  to: string;
  message: string;
  purpose?: string;
};

function senderId(): string {
  return (process.env.SMS_SENDER_ID ?? "Madetom").slice(0, 11);
}

function serviceBaseUrl(): string | null {
  const value = process.env.SMS_SERVICE_URL?.trim();
  if (!value) return null;
  return value.replace(/\/+$/, "");
}

function smsgateConfig(): { baseUrl: string; authorization: string } | null {
  const username = process.env.SMSGATE_USERNAME?.trim();
  const password = process.env.SMSGATE_PASSWORD?.trim();
  if (!username || !password) return null;
  const baseUrl = (process.env.SMSGATE_API_URL?.trim() || "https://api.sms-gate.app")
    .replace(/\/+$/, "");
  const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  return { baseUrl, authorization };
}

async function sendWithSmsGate({ to, message }: SmsMessage): Promise<SmsSendResult> {
  const config = smsgateConfig();
  if (!config) {
    return {
      ok: false,
      error:
        "SMSGate is selected but SMSGATE_USERNAME and SMSGATE_PASSWORD are not configured.",
      provider: "smsgate",
    };
  }

  const ttl = Number(process.env.SMSGATE_TTL_SECONDS ?? 3600);
  const simNumber = Number(process.env.SMSGATE_SIM_NUMBER ?? "");

  try {
    const response = await fetch(`${config.baseUrl}/3rdparty/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: config.authorization,
      },
      body: JSON.stringify({
        textMessage: { text: `Madetom · ${message}` },
        phoneNumbers: [normalizePhone(to)],
        ...(Number.isInteger(simNumber) && simNumber > 0 ? { simNumber } : {}),
        ttl: Number.isFinite(ttl) && ttl > 0 ? Math.trunc(ttl) : 3600,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });

    const body = (await response.json().catch(() => null)) as
      | { id?: string; state?: string; error?: string; message?: string }
      | null;

    if (!response.ok) {
      return {
        ok: false,
        error:
          body?.message ??
          body?.error ??
          (response.status === 401
            ? "SMSGate rejected the username or password."
            : response.status === 503
              ? "SMSGate queue is full. Try again shortly."
              : `SMSGate returned HTTP ${response.status}.`),
        provider: "smsgate",
      };
    }

    return { ok: true, providerMessageId: body?.id, provider: "smsgate" };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "SMSGate did not respond in time."
        : error instanceof Error && error.message === "fetch failed"
          ? "Could not reach SMSGate. Check the server's internet connection."
          : error instanceof Error
            ? error.message
            : "The SMSGate request failed.";

    return { ok: false, error: message.slice(0, 255), provider: "smsgate" };
  }
}

function sendWithLog({ to, message, purpose }: SmsMessage): SmsSendResult {
  const masked = to.length > 5 ? `${to.slice(0, 3)}***${to.slice(-2)}` : "***";
  console.info(
    `[sms:log] to=${masked} purpose=${purpose ?? "general"} chars=${message.length}`,
  );
  return { ok: true, providerMessageId: `log-${Date.now()}`, provider: "log" };
}

export function activeSmsProvider(): string {
  const provider = process.env.SMS_PROVIDER?.toLowerCase();
  if (provider === "smsgate") return "smsgate";
  return "log";
}

export async function dispatchSms(message: SmsMessage): Promise<SmsSendResult> {
  switch (activeSmsProvider()) {
    case "smsgate":
      return sendWithSmsGate(message);
    default:
      return sendWithLog(message);
  }
}

export function smsConfigured(): boolean {
  switch (activeSmsProvider()) {
    case "smsgate":
      return Boolean(
        process.env.SMSGATE_USERNAME?.trim() && process.env.SMSGATE_PASSWORD?.trim(),
      );
    default:
      return true;
  }
}
