import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { ArrowRight } from "lucide-react";
import { SendPlatformReportForm } from "./form";

export default async function PlatformReportPage() {
  await requireSuperAdmin();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="SamTech Labs"
        title="Platform daily report"
        description="Send an SMS report of platform health to the super admin."
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
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

      <section className="mt-6 rounded-xl border border-border bg-card shadow-[var(--shadow-card)] p-6">
        <SectionHeading
          title="About this report"
          description="The daily platform report includes workspace counts and SMS delivery stats."
        />
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
          <code className="font-mono text-xs">
            /api/cron/platform-report
          </code>{" "}
          with the <code className="font-mono text-xs">CRON_SECRET</code> bearer token.
        </p>
      </section>
    </div>
  );
}
