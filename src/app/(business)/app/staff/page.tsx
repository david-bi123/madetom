import { and, asc, eq } from "drizzle-orm";import { db } from "@/lib/db";
import { tenantMemberships, users } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { UserCog } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function StaffPage() {
  const context = await requireBusiness("staff.view");
  const tenantId = context.tenant.id;

  const rows = await db
    .select({
      membershipId: tenantMemberships.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      roleKey: tenantMemberships.roleKey,
      status: tenantMemberships.status,
      joinedAt: tenantMemberships.joinedAt,
      permissionsOverride: tenantMemberships.permissionsOverride,
    })
    .from(tenantMemberships)
    .innerJoin(users, eq(users.id, tenantMemberships.userId))
    .where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.status, "active")))
    .orderBy(asc(tenantMemberships.joinedAt));

  const activeCount = rows.filter((row) => row.status === "active").length;

  return (
    <div>
      <PageHeader
        eyebrow={context.activeBranch.name}
        title="Staff & roles"
        description={`${rows.length} people with access to this workspace, including the owner.`}
        actions={
          <a
            href="/app/staff/invite"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3.5 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgb(16_35_27/4%)] transition-colors hover:bg-muted/60"
          >
            Invite staff
          </a>
        }
      />

      {rows.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <EmptyState
            icon={UserCog}
            title="No staff yet"
            description="Invite your manager, cashier or inventory manager to the workspace."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Person</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Role</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Joined</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map((row) => (
                  <tr key={row.membershipId} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{row.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{row.email}</div>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] capitalize text-muted-foreground">{row.roleKey.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{row.joinedAt.toISOString().slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-[12px] text-muted-foreground">
        {activeCount} active member{activeCount === 1 ? "" : "s"} · owners can manage staff, managers can invite cashiers.
      </p>
    </div>
  );
}
