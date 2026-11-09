import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { PlatformSettingForm } from "@/components/admin/platform-setting-form";
import { getPlatformSettings } from "@/lib/platform-settings";
import { Settings } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function AdminSettingsPage() {
  await requireSuperAdmin();

  const [rows, platform] = await Promise.all([
    db.select().from(platformSettings).orderBy(asc(platformSettings.key)),
    getPlatformSettings(),
  ]);

  const currentValues: Record<string, unknown> = {
    "platform.maintenance.enabled": platform.maintenanceEnabled,
    "platform.maintenance.message": platform.maintenanceMessage,
    "platform.support.email": platform.supportEmail,
    "platform.trial_days": platform.trialDays,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="SamTech Labs"
        title="Platform settings"
        description="Configuration shared by every workspace on Madetom."
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border/80 px-4 py-3.5">
          <SectionHeading
            title="Stored values"
            description="Everything currently saved to the platform_settings table."
          />
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-5 text-[12px] text-muted-foreground">
            No settings have been overridden yet — defaults are in use.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Key</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Value</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map((row) => (
                  <tr key={row.key} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-[11.5px] text-foreground">{row.key}</td>
                    <td className="px-4 py-3 font-mono text-[11.5px] text-muted-foreground">
                      {JSON.stringify(row.value)}
                    </td>
                    <td className="px-4 py-3 text-right text-[11.5px] text-muted-foreground">
                      {formatDate(row.updatedAt, "datetime")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6">
        <PlatformSettingForm currentValues={currentValues} />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <SectionHeading
          title="What lives in environment variables"
          description="Secrets never touch the database — they stay on the server."
        />
        <ul className="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
          {[
            "DATABASE_URL — the MySQL/TiDB connection string",
            "TOKEN_PEPPER — pepper for hashing sessions, tokens and reset codes",
            "SMS_PROVIDER, SMS_SERVICE_URL, SMS_SERVICE_API_KEY, SMS_SENDER_ID — SMS delivery through the Python service",
            "APP_URL — the public base URL used in SMS links",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <Settings className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
