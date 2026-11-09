export const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: "GH₵",
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

export function currencySymbol(currency = "GHS"): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

/** Convert a decimal money value to integer minor units (pesewas). */
export function toMinor(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

/** Convert minor units back to a decimal string suitable for MySQL DECIMAL. */
export function fromMinor(minor: number): string {
  return (minor / 100).toFixed(2);
}

export function major(minor: number): number {
  return minor / 100;
}

export function formatMoney(
  value: string | number | null | undefined,
  currency = "GHS",
  options?: { compact?: boolean; hideSymbol?: boolean },
): string {
  const minor = toMinor(value);
  const symbol = currencySymbol(currency);
  if (options?.compact) {
    const amount = minor / 100;
    const formatted =
      Math.abs(amount) >= 1_000_000
        ? `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`
        : Math.abs(amount) >= 1_000
          ? `${(amount / 1_000).toFixed(1).replace(/\.0$/, "")}k`
          : amount.toFixed(0);
    return options.hideSymbol ? formatted : `${symbol}${formatted}`;
  }
  const formatted = new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(minor) / 100);
  const sign = minor < 0 ? "-" : "";
  return `${sign}${options?.hideSymbol ? "" : symbol}${formatted}`;
}

export function formatNumber(value: number | string): string {
  return new Intl.NumberFormat("en-GH").format(Number(value) || 0);
}

/**
 * Format an amount that is already held in integer minor units (pesewas).
 * `formatMoney` expects major units, so minor values must go through here.
 */
export function formatMinor(
  minor: number,
  currency = "GHS",
  options?: { compact?: boolean; hideSymbol?: boolean },
): string {
  return formatMoney(minor / 100, currency, options);
}

export function percent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** Parse user-entered money (e.g. "1,200.50") into minor units. */
export function parseMoneyInput(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function normalizePhone(input: string): string {
  const raw = input.trim().replace(/[\s()-]/g, "");
  if (raw.startsWith("+")) return `+${raw.slice(1).replace(/\D/g, "")}`;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("233")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+233${digits.slice(1)}`;
  if (digits.length >= 9) return `+${digits}`;
  return digits;
}

export function isValidPhone(input: string): boolean {
  const normalized = normalizePhone(input);
  return /^\+\d{9,15}$/.test(normalized);
}

export function maskPhone(phone: string): string {
  if (phone.length < 5) return "•••••";
  return `${phone.slice(0, 3)} ••• ••${phone.slice(-2)}`;
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}•••@${domain}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundMoney(minor: number): number {
  return Math.round(minor);
}
