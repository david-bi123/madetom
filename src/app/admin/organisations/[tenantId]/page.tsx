import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  invitations,
  products,
  sales,
  smsWallets,
  tenantMemberships,
  tenants,
  users,
} from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { PageHeader, StatCard, SectionHeading } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { setTenantStatus } from "@/app/admin/actions";
import { ArrowLeft, Building2, MapPin, Phone, Wallet } from "lucide-react";

export default async function AdminOrganisationDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  await requireSuperAdmin();
  const { tenantId } = await params;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) notFound();

  const [branchRows, memberRows, walletRow, productCount, saleCount, pendingInvites] =
    await Promise.all([
      db
        .select()
        .from(branches)
        .where(eq(branches.tenantId, tenantId))
        .orderBy(desc(branches.isDefault)),
      db
        .select({
          id: tenantMemberships.id,
          roleKey: tenantMemberships.roleKey,
          status: tenantMemberships.status,
          joinedAt: tenantMemberships.joinedAt,
          name: users.name,
          email: users.email,
          phone: users.phone,
          userStatus: users.status,
        })
        .from(tenantMemberships)
        .innerJoin(users, eq(users.id, tenantMemberships.userId))
        .where(eq(tenantMemberships.tenantId, tenantId))
        .orderBy(asc(tenantMemberships.joinedAt)),
      db
        .select({ credits: smsWallets.credits })
        .from(smsWallets)
        .where(eq(smsWallets.tenantId, tenantId))
        .limit(1),
      db
        .select({ value: count() })
        .from(products)
        .where(eq(products.tenantId, tenantId))
        .then((rows) => Number(rows[0]?.value ?? 0)),
      db
        .select({ value: count() })
        .from(sales)
        .where(eq(sales.tenantId, tenantId))
        .then((rows) => Number(rows[0]?.value ?? 0)),
      db
        .select({ value: count() })
        .from(invitations)
        .where(and(eq(invitations.tenantId, tenantId), eq(invitations.status, "pending")))
        .then((rows) => Number(rows[0]?.value ?? 0)),
    ]);

  const isSuspended = tenant.status === "suspended";

  return (
    <div>
      <div className="mb-5">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/organisations" />}
          nativeButton={false}
          className="-ml-2"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All organisations
        </Button>
      </div>

      <PageHeader
        eyebrow={tenant.slug}
        title={tenant.name}
        description={`${tenant.businessType} · ${tenant.region ?? tenant.location ?? "Ghana"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={tenant.status} />
            <form action={setTenantStatus}>
              <input type="hidden" name="tenantId" value={tenant.id} />
              <input type="hidden" name="status" value={isSuspended ? "active" : "suspended"} />
              {isSuspended ? (
                <Button type="submit" size="sm">
                  Reactivate organisation
                </Button>
              ) : (
                <Button type="submit" size="sm" variant="destructive">
                  Suspend organisation
                </Button>
              )}
            </form>
          </div>
        }
      />

      {isSuspended && tenant.suspendedReason ? (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-danger-soft px-4 py-3 text-[12.5px] text-destructive">
          Suspended: {tenant.suspendedReason}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Products" value={String(productCount)} icon={Building2} />
        <StatCard label="Sales recorded" value={String(saleCount)} />
        <StatCard label="SMS credits" value={String(walletRow?.[0]?.credits ?? 0)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/80 px-4 py-3.5">
              <SectionHeading
                title="Team"
                description={`${memberRows.length} member${memberRows.length === 1 ? "" : "s"} in this workspace.`}
              />
            </div>
            {memberRows.length === 0 ? (
              <p className="px-4 py-5 text-[12px] text-muted-foreground">
                Nobody has joined this organisation yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/45">
                      <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Member</th>
                      <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Role</th>
                      <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Status</th>
                      <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    {memberRows.map((member) => (
                      <tr key={member.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="text-[12.5px] font-medium text-foreground">{member.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{member.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={member.roleKey} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={member.status} />
                        </td>
                        <td className="px-4 py-3 text-right text-[11.5px] text-muted-foreground">
                          {formatDate(member.joinedAt, "short")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/80 px-4 py-3.5">
              <SectionHeading title="Branches" description="Where this organisation trades." />
            </div>
            <ul className="divide-y divide-border/80">
              {branchRows.map((branch) => (
                <li key={branch.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-foreground">
                      {branch.name}
                      {branch.isDefault ? (
                        <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {branch.code}
                      {branch.address ? ` · ${branch.address}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={branch.status} />
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <SectionHeading title="Organisation details" />
            <dl className="mt-4 space-y-3 text-[12.5px]">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusBadge status={tenant.status} />
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Business type</dt>
                <dd className="text-right font-medium text-foreground">{tenant.businessType}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Region</dt>
                <dd className="text-right font-medium text-foreground">{tenant.region ?? "—"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Currency</dt>
                <dd className="text-right font-mono font-medium text-foreground">{tenant.currency}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Tax rate</dt>
                <dd className="text-right font-mono font-medium text-foreground">{tenant.taxRate}%</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-right text-muted-foreground">{formatDate(tenant.createdAt, "datetime")}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Setup completed</dt>
                <dd className="text-right text-muted-foreground">
                  {tenant.onboardingCompletedAt
                    ? formatDate(tenant.onboardingCompletedAt, "datetime")
                    : "Not yet"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Pending invitations</dt>
                <dd className="text-right font-mono font-medium text-foreground">{pendingInvites}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <SectionHeading title="Contact" description="How the business was registered." />
            <ul className="mt-4 space-y-2.5 text-[12.5px]">
              <li className="flex items-center gap-2 text-foreground">
                <Phone className="size-3.5 text-muted-foreground" aria-hidden />
                {tenant.phone ?? "—"}
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <MapPin className="size-3.5 text-muted-foreground" aria-hidden />
                {tenant.location ?? "—"}
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
