import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  invitations,
  sales,
  smsWallets,
  subscriptionHistory,
  subscriptionPlans,
  subscriptions,
  tenantMemberships,
  tenants,
  users,
} from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { PageHeader, StatCard, SectionHeading } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { setTenantStatus } from "@/app/admin/actions";
import { ArrowLeft, Building2, MapPin, Phone, Users } from "lucide-react";
import { formatPlanPrice, getPlanConfig } from "@/lib/subscription/plans";
import { getOrganisationUsage } from "@/lib/subscription/entitlements";
import { PlanChangeForm } from "@/components/admin/plan-change-form";
import { SubscriptionStatusForm } from "@/components/admin/subscription-status-form";
import { SubscriptionExtendForm } from "@/components/admin/subscription-extend-form";
import { PaymentExemptionForm } from "@/components/admin/payment-exemption-form";
import { ResendInvitationButton } from "@/components/admin/resend-invitation-button";

export default async function AdminOrganisationDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  await requireSuperAdmin();
  const { tenantId } = await params;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) notFound();

  const [subscriptionRow] = await db
    .select({ subscription: subscriptions, plan: subscriptionPlans })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.key, subscriptions.planKey))
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1);

  const planConfig = subscriptionRow?.plan ? getPlanConfig(subscriptionRow.plan.key) : null;

  const [branchRows, memberRows, walletRow, saleCount, pendingInvites, pendingInvitationRows] =
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
        .from(sales)
        .where(eq(sales.tenantId, tenantId))
        .then((rows) => Number(rows[0]?.value ?? 0)),
      db
        .select({ value: count() })
        .from(invitations)
        .where(and(eq(invitations.tenantId, tenantId), eq(invitations.status, "pending")))
        .then((rows) => Number(rows[0]?.value ?? 0)),
      db
        .select({
          id: invitations.id,
          name: invitations.name,
          phone: invitations.phone,
          type: invitations.type,
          deliveryStatus: invitations.deliveryStatus,
          expiresAt: invitations.expiresAt,
        })
        .from(invitations)
        .where(and(eq(invitations.tenantId, tenantId), eq(invitations.status, "pending")))
        .orderBy(desc(invitations.createdAt)),
    ]);

  const isSuspended = tenant.status === "suspended";

  const [usage, historyRows] = await Promise.all([
    getOrganisationUsage(tenantId),
    db
      .select()
      .from(subscriptionHistory)
      .where(eq(subscriptionHistory.tenantId, tenantId))
      .orderBy(desc(subscriptionHistory.createdAt))
      .limit(12),
  ]);

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
        <StatCard
          label="Products"
          value={`${usage.products.used.toLocaleString()}${usage.products.limit === null ? "" : ` / ${usage.products.limit.toLocaleString()}`}`}
          icon={Building2}
          hint={usage.products.limit === null ? "Unlimited" : "Active products"}
          tone={usage.overLimit ? "warning" : "default"}
        />
        <StatCard
          label="Team"
          value={`${usage.staff.used}${usage.staff.limit === null ? "" : ` / ${usage.staff.limit}`}`}
          icon={Users}
          hint={`${usage.staff.active} active · ${usage.staff.pendingInvitations} invited`}
        />
        <StatCard
          label="Branches"
          value={`${usage.branches.used}${usage.branches.limit === null ? "" : ` / ${usage.branches.limit}`}`}
          hint="Active branches"
        />
        <StatCard
          label="Plan"
          value={planConfig?.name ?? "None"}
          hint={
            subscriptionRow?.subscription
              ? `${subscriptionRow.subscription.status.replaceAll("_", " ")} · ${
                  subscriptionRow.subscription.currentPeriodEnd
                    ? formatDate(subscriptionRow.subscription.currentPeriodEnd, "short")
                    : "no renewal date"
                }`
              : "No subscription"
          }
        />
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
              <SectionHeading
                title="Pending invitations"
                description="Send a fresh setup link if the owner never received the SMS."
              />
            </div>
            {pendingInvitationRows.length === 0 ? (
              <p className="px-4 py-5 text-[12px] text-muted-foreground">
                No pending invitations for this organisation.
              </p>
            ) : (
              <ul className="divide-y divide-border/80">
                {pendingInvitationRows.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-foreground">{invite.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {invite.phone ?? "—"} · {invite.type} · {invite.deliveryStatus} · expires{" "}
                        {formatDate(invite.expiresAt, "short")}
                      </p>
                    </div>
                    <ResendInvitationButton invitationId={invite.id} />
                  </li>
                ))}
              </ul>
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

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/80 px-4 py-3.5">
              <SectionHeading
                title="Subscription history"
                description="Every plan, status and renewal change for this organisation."
              />
            </div>
            {historyRows.length === 0 ? (
              <p className="px-4 py-5 text-[12px] text-muted-foreground">
                No subscription history recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/80">
                {historyRows.map((entry) => (
                  <li key={entry.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-foreground">
                          {entry.action.replaceAll("_", " ")} · {entry.planKey}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {entry.notes ?? "No notes."}
                        </p>
                        <p className="mt-1 text-[10.5px] text-muted-foreground">
                          {formatDate(entry.effectiveAt, "datetime")}
                          {entry.actorName ? ` · ${entry.actorName}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={entry.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
                <dt className="text-muted-foreground">Sales recorded</dt>
                <dd className="text-right font-mono font-medium text-foreground">{saleCount}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">SMS credits</dt>
                <dd className="text-right font-mono font-medium text-foreground">
                  {Number(walletRow?.[0]?.credits ?? 0)}
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

          <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <SectionHeading title="Subscription" description="Current billing state for this organisation." />
            <dl className="mt-4 space-y-3 text-[12.5px]">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="text-right font-medium text-foreground">{planConfig?.name ?? "None"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusBadge status={subscriptionRow?.subscription.status ?? "none"} />
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Monthly amount</dt>
                <dd className="text-right font-mono font-medium text-foreground">
                  {planConfig ? formatPlanPrice(planConfig.priceMonthly) : "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Renews</dt>
                <dd className="text-right text-muted-foreground">
                  {formatDate(subscriptionRow?.subscription.currentPeriodEnd, "long")}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Billing amount</dt>
                <dd className="text-right font-mono text-muted-foreground">
                  {subscriptionRow?.subscription
                    ? formatMoney(subscriptionRow.subscription.billingAmount, subscriptionRow.subscription.currency)
                    : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <SectionHeading title="Plan management" description="Change the subscription plan for this organisation." />
            <PlanChangeForm tenantId={tenantId} currentPlanKey={subscriptionRow?.subscription.planKey ?? null} />
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <SectionHeading
              title="Payment"
              description="Control whether this organisation can pay for plans online."
            />
            <div className="mt-4">
              <PaymentExemptionForm tenantId={tenantId} exempt={tenant.paymentExempt} />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <SectionHeading
              title="Status & renewal"
              description="Suspend, expire or extend this subscription without deleting any data."
            />
            <div className="mt-4 space-y-5">
              <SubscriptionStatusForm
                tenantId={tenantId}
                currentStatus={subscriptionRow?.subscription.status ?? null}
              />
              <div className="border-t border-border/70 pt-4">
                <SubscriptionExtendForm tenantId={tenantId} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

