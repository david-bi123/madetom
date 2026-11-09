import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, tenants } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { formatDate, isExpired } from "@/lib/dates";
import { PageHeader, EmptyState, StatCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { revokeInvitation } from "@/app/admin/actions";
import { Mail, MailCheck, MailX } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function AdminInvitationsPage() {
  await requireSuperAdmin();

  const rows = await db
    .select({
      id: invitations.id,
      type: invitations.type,
      name: invitations.name,
      email: invitations.email,
      phone: invitations.phone,
      roleKey: invitations.roleKey,
      status: invitations.status,
      deliveryStatus: invitations.deliveryStatus,
      expiresAt: invitations.expiresAt,
      lastSentAt: invitations.lastSentAt,
      createdAt: invitations.createdAt,
      tenantId: invitations.tenantId,
      tenantName: tenants.name,
    })
    .from(invitations)
    .innerJoin(tenants, eq(tenants.id, invitations.tenantId))
    .orderBy(desc(invitations.createdAt))
    .limit(120);

  const pending = rows.filter((row) => row.status === "pending");
  const delivered = pending.filter((row) => row.deliveryStatus === "sent");
  const failed = pending.filter((row) => row.deliveryStatus === "failed");

  return (
    <div>
      <PageHeader
        eyebrow="SamTech Labs"
        title="Invitations"
        description="Every owner and staff invitation sent across the platform, with delivery status."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={String(pending.length)} icon={Mail} tone={pending.length > 0 ? "warning" : "default"} />
        <StatCard label="Delivered" value={String(delivered.length)} icon={MailCheck} tone="gold" />
        <StatCard label="Delivery failed" value={String(failed.length)} icon={MailX} />
        <StatCard label="Total shown" value={String(rows.length)} />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {rows.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No invitations sent"
            description="Invitations created from the organisations page will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Invitee</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Organisation</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Role</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Delivery</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Expires</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map((row) => {
                  const expired = row.status === "pending" && isExpired(row.expiresAt);
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="text-[12.5px] font-medium text-foreground">{row.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{row.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{row.tenantName}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.roleKey} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.deliveryStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={expired ? "expired" : row.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-[11.5px] text-muted-foreground">
                        {formatDate(row.expiresAt, "short")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.status === "pending" ? (
                          <form action={revokeInvitation}>
                            <input type="hidden" name="invitationId" value={row.id} />
                            <Button variant="outline" size="sm" type="submit">
                              Revoke
                            </Button>
                          </form>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
