import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SendPlatformReportForm } from "./form";

export default async function PlatformReportPage() {
  await requireSuperAdmin();

  let report;
  try {
    const res = await fetch(
      `${process.env.APP_URL ?? "https://madetom.vercel.app"}/api/admin/send-platform-report`,
      { method: "POST", cache: "no-store" },
    );
    report = await res.json();
  } catch {
    report = null;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="SamTech Labs"
        title="Platform daily report"
        description="Send an SMS report of platform health to the super admin."
      />

      {report?.ok ? (
        <section className="mt-6 rounded-xl border border-success-soft bg-success-soft shadow-[var(--shadow-card)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="size-5 text-success" aria-hidden />
            <h2 className="text-lg font-semibold text-success">Report sent successfully</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Total Workspaces
              </p>
              <p className="text-2xl font-bold text-foreground">{report.report?.tenants ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Active Workspaces
              </p>
              <p className="text-2xl font-bold text-success">{report.report?.activeTenants ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                SMS Sent
              </p>
              <p className="text-2xl font-bold text-success">{report.report?.smsSentToday ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                SMS Failed
              </p>
              <p className="text-2xl font-bold text-destructive">{report.report?.smsFailedToday ?? 0}</p>
            </div>
          </div>
          <p className="mt-4 text-[12px] text-muted-foreground">
            Report sent to your phone ({report.date ?? "today"}).
          </p>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border/80 px-4 py-3.5">
            <SectionHeading
              title="Send test report now"
              description="Trigger an immediate platform health report via SMS to your phone."
            />
          </div>
          <div className="p-6">
            <SendPlatformReportForm />
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-border bg-card shadow-[var(--shadow-card)] p-6">
        <SectionHeading title="About this report" description="What the daily platform report includes." />
        <ul className="mt-3 space-y-2 text-[12px] text-muted-foreground">
          <li className="flex gap-2">
            <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            <span>Total and active workspaces on Madetom</span>
          </li>
          <li className="flex gap-2">
            <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            <span>SMS messages sent and failed in the last 24 hours</span>
          </li>
          <li className="flex gap-2">
            <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            <span>Sent to the super admin phone number on file</span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Schedule this automatically by adding a Vercel Cron job to{" "}
          <code className="font-mono text-xs">/api/cron/platform-report</code>{" "}
          with the <code className="font-mono text-xs">CRON_SECRET</code> bearer token.
        </p>
      </section>
    </div>
  );
}
