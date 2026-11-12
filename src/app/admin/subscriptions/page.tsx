import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptionPlans, subscriptions, tenants } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { PageHeader, StatCard, SectionHeading, EmptyState } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreditCard } from "lucide-react";
import { getOrganisationUsage, type OrganisationUsage } from "@/lib/subscription/entitlements";
import { formatLimit, formatPlanPrice } from "@/lib/subscription/plans";

/** This screen reads request-time data, so it is a blocking route. */

export default async function AdminSubscriptionsPage() {
  await requireSuperAdmin();

  const [planRows, subscriptionRows] = await Promise.all([
    db
      .select()
      .from(subscriptionPlans)
      .orderBy(asc(subscriptionPlans.sortOrder)),
    db
      .select({
        id: subscriptions.id,
        tenantId: subscriptions.tenantId,
        tenantName: tenants.name,
        planKey: subscriptions.planKey,
        status: subscriptions.status,
        billingCycle: subscriptions.billingCycle,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        trialEndsAt: subscriptions.trialEndsAt,
      })
      .from(subscriptions)
      .innerJoin(tenants, eq(tenants.id, subscriptions.tenantId))
      .orderBy(desc(subscriptions.updatedAt)),
  ]);

  const active = subscriptionRows.filter((row) => row.status === "active").length;
  const trial = subscriptionRows.filter((row) => row.status === "trial").length;
  const pastDue = subscriptionRows.filter((row) => row.status === "past_due").length;
  const paused = subscriptionRows.filter((row) =>
    ["suspended", "expired", "cancelled"].includes(row.status),
  ).length;

  const usageByTenant = new Map<string, OrganisationUsage>(
    await Promise.all(
      subscriptionRows.map(async (row) => [row.tenantId, await getOrganisationUsage(row.tenantId)] as const),
    ),
  );

  return (
    <div>
      <PageHeader
        eyebrow="SamTech Labs"
        title="Subscriptions"
        description="Plans on offer and the subscription every organisation is on."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active" value={String(active)} icon={CreditCard} tone="gold" hint={`${subscriptionRows.length} total`} />
        <StatCard label="On trial" value={String(trial)} />
        <StatCard label="Past due" value={String(pastDue)} tone={pastDue > 0 ? "critical" : "default"} />
        <StatCard label="Paused" value={String(paused)} hint="Suspended, expired or cancelled" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border/80 px-4 py-3.5">
            <SectionHeading
              title="Organisation subscriptions"
              description="Plan, billing cycle and renewal date for each workspace."
            />
          </div>
          {subscriptionRows.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No subscriptions yet"
              description="Subscriptions appear here once an organisation is created."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/45">
                    <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Organisation</th>
                    <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Plan</th>
                    <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Usage</th>
                    <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Renews</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/80">
                  {subscriptionRows.map((row) => {
                    const usage = usageByTenant.get(row.tenantId);
                    return (
                    <tr key={row.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/organisations/${row.tenantId}`}
                          className="text-[12.5px] font-medium text-foreground hover:underline"
                        >
                          {row.tenantName}
                        </Link>
                        {usage?.overLimit ? (
                          <p className="mt-0.5 text-[10.5px] font-medium text-destructive">Over limit</p>
                        ) : usage?.approachingLimit ? (
                          <p className="mt-0.5 text-[10.5px] font-medium text-[#8a641a]">Near limit</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.planKey} />
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">
                        {usage ? (
                          <div className="space-y-0.5 font-mono tabular">
                            <p>P {usage.products.used}/{formatLimit(usage.products.limit)}</p>
                            <p>S {usage.staff.used}/{formatLimit(usage.staff.limit)}</p>
                            <p>B {usage.branches.used}/{formatLimit(usage.branches.limit)}</p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-[11.5px] text-muted-foreground">
                        {row.currentPeriodEnd ? formatDate(row.currentPeriodEnd, "short") : "—"}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border/80 px-4 py-3.5">
            <SectionHeading title="Plans" description="Limits and pricing available to businesses." />
          </div>
          <ul className="divide-y divide-border/80">
            {planRows.map((plan) => (
              <li key={plan.key} className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold text-foreground">{plan.name}</p>
                  <StatusBadge status={plan.isActive ? "active" : "archived"} />
                </div>
                {plan.description ? (
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{plan.description}</p>
                ) : null}
                <p className="mt-2 font-mono text-[12px] font-medium tabular text-foreground">
                  {formatPlanPrice(Math.round(Number(plan.priceMonthly) * 100))}
                  <span className="font-sans text-[11px] font-normal text-muted-foreground"> / month</span>
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Staff</dt>
                    <dd className="font-mono tabular">{plan.maxEmployees}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Branches</dt>
                    <dd className="font-mono tabular">{plan.maxBranches}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Products</dt>
                    <dd className="font-mono tabular">{formatLimit(plan.maxProducts)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>SMS</dt>
                    <dd className="font-mono tabular">{plan.smsCredits}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
