import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, tenants } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { PageHeader, EmptyState, StatCard } from "@/components/ui/page-header";
import { FileClock } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */

export default async function AdminAuditPage() {
  await requireSuperAdmin();

  const rows = await db
    .select({
      id: auditLogs.id,
      actorName: auditLogs.actorName,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      summary: auditLogs.summary,
      ip: auditLogs.ip,
      createdAt: auditLogs.createdAt,
      tenantName: tenants.name,
    })
    .from(auditLogs)
    .leftJoin(tenants, eq(tenants.id, auditLogs.tenantId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = rows.filter((row) => row.createdAt.getTime() >= today.getTime()).length;
  const platformCount = rows.filter((row) => !row.tenantName).length;

  return (
    <div>
      <PageHeader
        eyebrow="SamTech Labs"
        title="Audit log"
        description="An immutable record of who did what, across every workspace and the platform console."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Entries shown" value={String(rows.length)} icon={FileClock} />
        <StatCard label="Since midnight" value={String(todayCount)} />
        <StatCard label="Platform entries" value={String(platformCount)} />
        <StatCard label="Workspaces" value={String(new Set(rows.map((row) => row.tenantName).filter(Boolean)).size)} />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {rows.length === 0 ? (
          <EmptyState
            icon={FileClock}
            title="No activity recorded"
            description="Actions taken in Madetom will be written here as they happen."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">When</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Actor</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Action</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Summary</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Workspace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {formatDate(row.createdAt, "datetime")}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] font-medium text-foreground">{row.actorName}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                        {row.action}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{row.summary}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{row.tenantName ?? "Platform"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
