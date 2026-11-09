import Link from "next/link";
import { count, desc, eq, gte } from "drizzle-orm";
import { startOfMonth } from "date-fns";
import { db } from "@/lib/db";
import { auditLogs, invitations, smsLogs, subscriptions, tenants } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { PageHeader, StatCard, SectionHeading } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, Mail, MessageSquare } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */

export default async function AdminOverviewPage() {
  await requireSuperAdmin();

  const [organisationCount, activeSubscriptions, pendingInvitations, smsThisMonth, recentOrgs, recentAudit] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(tenants)
        .then((rows) => Number(rows[0]?.value ?? 0)),
      db
        .select({ value: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, "active"))
        .then((rows) => Number(rows[0]?.value ?? 0)),
      db
        .select({ value: count() })
        .from(invitations)
        .where(eq(invitations.status, "pending"))
        .then((rows) => Number(rows[0]?.value ?? 0)),
      db
        .select({ value: count() })
        .from(smsLogs)
        .where(gte(smsLogs.createdAt, startOfMonth(new Date())))
        .then((rows) => Number(rows[0]?.value ?? 0)),
      db
        .select({
          id: tenants.id,
          name: tenants.name,
          businessType: tenants.businessType,
          status: tenants.status,
          createdAt: tenants.createdAt,
        })
        .from(tenants)
        .orderBy(desc(tenants.createdAt))
        .limit(6),
      db
        .select({
          id: auditLogs.id,
          actorName: auditLogs.actorName,
          action: auditLogs.action,
          summary: auditLogs.summary,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(8),
    ]);

  return (
    <div>
      <PageHeader
        eyebrow="SamTech Labs"
        title="Platform overview"
        description="Every Madetom workspace, its subscription, and the activity behind it."
        actions={
          <Button render={<Link href="/admin/organisations" />} nativeButton={false}>
            <Building2 className="size-4" aria-hidden />
            Manage organisations
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Organisations" value={String(organisationCount)} icon={Building2} />
        <StatCard label="Active subscriptions" value={String(activeSubscriptions)} icon={CreditCard} tone="gold" />
        <StatCard label="Pending invitations" value={String(pendingInvitations)} icon={Mail} tone={pendingInvitations > 0 ? "warning" : "default"} />
        <StatCard label="SMS this month" value={String(smsThisMonth)} icon={MessageSquare} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="px-4 pt-4">
            <SectionHeading title="Newest organisations" description="Most recently added workspaces." />
          </div>
          <div className="mt-3 divide-y divide-border/80 border-t border-border/80">
            {recentOrgs.length === 0 ? (
              <p className="px-4 py-5 text-[12px] text-muted-foreground">No organisations yet.</p>
            ) : (
              recentOrgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/admin/organisations/${org.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-foreground">{org.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {org.businessType} · joined {formatDate(org.createdAt, "short")}
                    </p>
                  </div>
                  <StatusBadge status={org.status} />
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="px-4 pt-4">
            <SectionHeading title="Recent platform activity" description="Audit trail across all workspaces." />
          </div>
          <div className="mt-3 divide-y divide-border/80 border-t border-border/80">
            {recentAudit.length === 0 ? (
              <p className="px-4 py-5 text-[12px] text-muted-foreground">No activity recorded yet.</p>
            ) : (
              recentAudit.map((entry) => (
                <div key={entry.id} className="px-4 py-3">
                  <p className="text-[12.5px] font-medium text-foreground">{entry.summary}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {entry.actorName} · {entry.action} · {formatDate(entry.createdAt, "datetime")}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
