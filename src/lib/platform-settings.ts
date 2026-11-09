import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";

/**
 * Platform-level configuration lives in the database so SamTech Labs can change
 * it from the admin console without a redeploy. Environment variables still
 * win for secrets (SMS provider credentials, database URL, token pepper).
 */
export const PLATFORM_SETTING_DEFAULTS = {
  "platform.maintenance.enabled": false,
  "platform.maintenance.message":
    "Madetom is briefly under maintenance. Your data is safe — please check back shortly.",
  "platform.support.email": "support@madetom.app",
  "platform.trial_days": 14,
} as const;

export type PlatformSettingKey = keyof typeof PLATFORM_SETTING_DEFAULTS;

export const PLATFORM_SETTING_KEYS = Object.keys(
  PLATFORM_SETTING_DEFAULTS,
) as PlatformSettingKey[];

export type PlatformSettings = {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  supportEmail: string;
  trialDays: number;
};

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  if (typeof value === "number") return value !== 0;
  return fallback;
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

export const getPlatformSettings = cache(async (): Promise<PlatformSettings> => {
  const rows = await db.select().from(platformSettings);
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return {
    maintenanceEnabled: asBoolean(
      values.get("platform.maintenance.enabled"),
      PLATFORM_SETTING_DEFAULTS["platform.maintenance.enabled"],
    ),
    maintenanceMessage: asString(
      values.get("platform.maintenance.message"),
      PLATFORM_SETTING_DEFAULTS["platform.maintenance.message"],
    ),
    supportEmail: asString(
      values.get("platform.support.email"),
      PLATFORM_SETTING_DEFAULTS["platform.support.email"],
    ),
    trialDays: Number(
      asString(
        values.get("platform.trial_days"),
        String(PLATFORM_SETTING_DEFAULTS["platform.trial_days"]),
      ),
    ) || PLATFORM_SETTING_DEFAULTS["platform.trial_days"],
  };
});

export async function getPlatformSettingValue(key: string): Promise<unknown> {
  const [row] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);
  if (row) return row.value;
  return (PLATFORM_SETTING_DEFAULTS as Record<string, unknown>)[key] ?? null;
}
