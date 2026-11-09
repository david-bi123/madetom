import { and, count, eq, gte } from "drizzle-orm";
import { startOfMonth } from "date-fns";
import { db } from "@/lib/db";
import { products, sales, smsWallets, tenantMemberships, branches } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function SubscriptionPage() {
  const context = await requireBusiness("subscription.view");
  const tenantId = context.tenant.id;

  const [productCount, staffCount, branchCount, transactionCount, wallet] = await Promise.all([
    db
      .select({ value: count() })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.status, "active")))
      .then((rows) => Number(rows[0]?.value ?? 0)),
    db
      .select({ value: count() })
      .from(tenantMemberships)
      .where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.status, "active")))
      .then((rows) => Number(rows[0]?.value ?? 0)),
    db
      .select({ value: count() })
      .from(branches)
      .where(and(eq(branches.tenantId, tenantId), eq(branches.status, "active")))
      .then((rows) => Number(rows[0]?.value ?? 0)),
    db
      .select({ value: count() })
      .from(sales)
      .where(and(eq(sales.tenantId, tenantId), gte(sales.createdAt, startOfMonth(new Date()))))
      .then((rows) => Number(rows[0]?.value ?? 0)),
    db
      .select({ credits: smsWallets.credits })
      .from(smsWallets)
      .where(eq(smsWallets.tenantId, tenantId))
      .limit(1)
      .then((rows) => Number(rows[0]?.credits ?? 0)),
  ]);

  const plan = context.plan;
  const subscription = context.subscription;

  const usage = [
    {
      label: "Products",
      used: productCount,
      limit: plan?.maxProducts ?? 0,
    },
    {
      label: "Team members",
      used: staffCount,
      limit: plan?.maxEmployees ?? 0,
    },
    {
      label: "Branches",
      used: branchCount,
      limit: plan?.maxBranches ?? 0,
    },
    {
      label: "Transactions this month",
      used: transactionCount,
      limit: plan?.maxTransactionsPerMonth ?? 0,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={context.tenant.name}
        title="Plan & usage"
        description="Your subscription, what you have used this month, and the SMS credits available."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Current plan" value={plan?.name ?? "Trial"} icon={CreditCard} tone="gold" />
        <StatCard label="Status" value={<StatusBadge status={subscription?.status ?? "trial"} />} />
        <StatCard label="SMS credits" value={String(wallet)} />
        <StatCard
          label="Monthly price"
          value={plan ? formatMoney(plan.priceMonthly) : "—"}
          hint={subscription?.billingCycle ? `Billed ${subscription.billingCycle}` : undefined}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border/80 px-4 py-3.5">
          <h2 className="font-heading text-[15px] font-semibold">Usage against your plan</h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {plan?.description ?? "Your workspace plan limits what you can add."}
          </p>
        </div>
        <div className="divide-y divide-border/80">
          {usage.map((item) => {
            const limit = item.limit > 0 ? item.limit : null;
            const percentage = limit ? Math.min(100, Math.round((item.used / limit) * 100)) : 0;
            return (
              <div key={item.label} className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="font-mono text-[11.5px] text-muted-foreground tabular">
                    {item.used} {limit ? `/ ${limit}` : "used"}
                  </span>
                </div>
                <div className="mt-2">
                  <Progress value={percentage} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {subscription?.currentPeriodEnd ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Current period ends {formatDate(subscription.currentPeriodEnd, "long")}.
        </p>
      ) : null}
    </div>
  );
}
