import { addDays, endOfDay, startOfDay, subDays } from "date-fns";

/** Madetom's initial market is Ghana (UTC+0), so server-day boundaries are UTC. */
export function startOfDayUtc(date: Date = new Date()): Date {
  return startOfDay(date);
}

export function endOfDayUtc(date: Date = new Date()): Date {
  return endOfDay(date);
}

export function todayInput(): string {
  return toDateInput(new Date());
}

export function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInput(value: string | undefined | null, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export type RangePreset = "today" | "7d" | "30d" | "month" | "custom";

export function resolveRange(params: {
  range?: string;
  from?: string;
  to?: string;
}): { from: Date; to: Date; preset: RangePreset; label: string } {
  const now = new Date();
  const preset = (["today", "7d", "30d", "month", "custom"] as const).includes(
    (params.range ?? "") as RangePreset,
  )
    ? (params.range as RangePreset)
    : "30d";

  if (preset === "today") {
    return { from: startOfDay(now), to: endOfDay(now), preset, label: "Today" };
  }
  if (preset === "7d") {
    return { from: startOfDay(subDays(now, 6)), to: endOfDay(now), preset, label: "Last 7 days" };
  }
  if (preset === "month") {
    return {
      from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: endOfDay(now),
      preset,
      label: "This month",
    };
  }
  if (preset === "custom" && params.from) {
    const from = startOfDay(parseDateInput(params.from, subDays(now, 29)));
    const to = endOfDay(parseDateInput(params.to, now));
    return {
      from,
      to,
      preset,
      label: `${toDateInput(from)} – ${toDateInput(to)}`,
    };
  }
  return {
    from: startOfDay(subDays(now, 29)),
    to: endOfDay(now),
    preset: preset === "custom" ? "30d" : preset,
    label: "Last 30 days",
  };
}

export function previousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const span = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - span), to: new Date(from.getTime() - 1) };
}

export function formatDate(
  value: Date | string | null | undefined,
  style: "short" | "long" | "datetime" | "time" = "short",
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const options: Intl.DateTimeFormatOptions =
    style === "long"
      ? { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" }
      : style === "datetime"
        ? {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Africa/Accra",
          }
        : style === "time"
          ? { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" }
          : { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" };
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

export function relativeTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return formatDate(date);
}

export function lastNDays(days: number): Date[] {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => addDays(today, index - (days - 1)));
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * True when a deadline has passed. Kept in one place so server components can
 * reason about expiry without reaching for `Date.now()` during render.
 */
export function isExpired(date: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!date) return true;
  const expiry = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(expiry.getTime())) return true;
  return expiry.getTime() < now.getTime();
}
