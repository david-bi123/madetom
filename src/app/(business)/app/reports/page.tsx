import { and, eq, gte, lte, sql } from "drizzle-orm";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { db } from "@/lib/db";
import { saleItems, sales } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { lastNDays, dayKey } from "@/lib/dates";
import { formatMoney, percent } from "@/lib/format";
import { PageHeader, StatCard, SectionHeading } from "@/components/ui/page-header";
import { SalesChart, type SalesChartPoint } from "@/components/charts/sales-chart";
import { Button } from "@/components/ui/button";
import { Download, FileText, Lock } from "lucide-react";
import { CircleDollarSign, ClipboardCheck, ReceiptText } from "lucide-react";
import Link from "next/link";
import { hasFeature } from "@/lib/subscription/entitlements";
import { cheapestPlanForFeature, getPlanConfig } from "@/lib/subscription/plans";

/** This screen reads request-time data, so it is a blocking route. */

export default async function ReportsPage() {
  const context = await requireBusiness("reports.view");
  const tenantId = context.tenant.id;
  const branchId = context.activeBranch.id;
  const now = new Date();

  const profitAccess = await hasFeature(tenantId, "reports.profit");
  const profitPlan = cheapestPlanForFeature("reports.profit");

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const todayRows = await db
    .select({
      revenue: sql<string>`coalesce(sum(${sales.total} - ${sales.taxAmount}), 0)`,
      total: sql<string>`coalesce(sum(${sales.total}), 0)`,
      cogs: sql<string>`coalesce(sum(${saleItems.unitCost} * ${saleItems.quantity}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .leftJoin(saleItems, and(eq(saleItems.saleId, sales.id), eq(saleItems.tenantId, tenantId)))
    .where(
      and(
        eq(sales.tenantId, tenantId),
        eq(sales.branchId, branchId),
        eq(sales.status, "completed"),
        gte(sales.createdAt, todayStart),
        lte(sales.createdAt, todayEnd),
      ),
    );
  const today = todayRows[0];
  const netRevenueToday = Number(today?.revenue ?? 0);
  const grossProfitToday = netRevenueToday - Number(today?.cogs ?? 0);
  const marginToday = netRevenueToday > 0 ? (grossProfitToday / netRevenueToday) * 100 : 0;

  const monthRows = await db
    .select({
      revenue: sql<string>`coalesce(sum(${sales.total} - ${sales.taxAmount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.tenantId, tenantId),
        eq(sales.branchId, branchId),
        eq(sales.status, "completed"),
        gte(sales.createdAt, startOfDay(subDays(now, 30))),
        lte(sales.createdAt, endOfDay(now)),
      ),
    );
  const month = monthRows[0];
  const netRevenue30Days = Number(month?.revenue ?? 0);

  const chartRows = await db
    .select({
      day: sql<string>`date_format(${sales.createdAt}, '%Y-%m-%d')`.as("day"),
      revenue: sql<string>`coalesce(sum(${sales.total} - ${sales.taxAmount}), 0)`,
      transactions: sql<number>`count(*)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.tenantId, tenantId),
        eq(sales.branchId, branchId),
        gte(sales.createdAt, startOfDay(subDays(now, 13))),
        lte(sales.createdAt, endOfDay(now)),
      ),
    )
    // TiDB enforces ONLY_FULL_GROUP_BY and matches expressions literally, so
    // the alias is used instead of repeating date_format() with a table prefix.
    .groupBy(sql`day`);

  const chartMap = new Map(
    chartRows.map((row) => [
      row.day,
      { revenue: Number(row.revenue), transactions: Number(row.transactions) },
    ]),
  );
  const chartData: SalesChartPoint[] = lastNDays(14).map((day) => {
    const key = dayKey(day);
    const found = chartMap.get(key);
    return {
      date: key,
      label: format(day, "d MMM"),
      revenue: found?.revenue ?? 0,
      transactions: found?.transactions ?? 0,
    };
  });
  const chartTotal = chartRows.reduce((sum, row) => sum + Number(row.revenue), 0);

  const exportBase = `/api/reports/export?branchId=${encodeURIComponent(branchId)}&days=30`;

  return (
    <div>
      <PageHeader
        eyebrow={context.activeBranch.name}
        title="Reports"
        description="Net revenue, profit and trends for this branch. Exports are ready for your accountant."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" render={<a href={`${exportBase}&format=csv`} />} nativeButton={false}>
              <Download className="size-4" aria-hidden />
              Export CSV
            </Button>
            <Button render={<a href={`${exportBase}&format=pdf`} />} nativeButton={false}>
              <FileText className="size-4" aria-hidden />
              Export PDF
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Net revenue today" value={formatMoney(netRevenueToday)} icon={CircleDollarSign} tone="gold" />
        {profitAccess.allowed ? (
          <StatCard label="Gross profit today" value={formatMoney(Math.max(grossProfitToday, 0))} icon={ClipboardCheck} tone={grossProfitToday < 0 ? "critical" : "default"} hint={`${percent(marginToday)} margin`} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[12px] font-medium text-muted-foreground">Gross profit today</p>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Lock className="size-3.5" aria-hidden />
              </span>
            </div>
            <p className="mt-2 font-heading text-[16px] leading-tight font-semibold text-ink">Growth plan</p>
            <Link
              href="/app/subscription"
              className="mt-2 inline-flex items-center text-[11.5px] font-semibold text-primary underline underline-offset-2"
            >
              Upgrade to unlock profit reporting
            </Link>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {profitPlan ? `${getPlanConfig(profitPlan).name} and above` : "Higher plans"}
            </p>
          </div>
        )}
        <StatCard label="Transactions today" value={String(Number(today?.count ?? 0))} icon={ReceiptText} />
        <StatCard label="Net revenue · 30 days" value={formatMoney(netRevenue30Days)} icon={CircleDollarSign} />
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeading
            title="Sales over the last 14 days"
            description="Net of tax and discounts, excluding refunds."
          />
          <div className="text-left sm:text-right">
            <p className="font-heading text-[18px] font-semibold tracking-[-0.02em] tabular">
              {formatMoney(chartTotal)}
            </p>
            <p className="text-[10.5px] text-muted-foreground">14-day net revenue</p>
          </div>
        </div>
        <div className="px-2 pt-2 pb-3 sm:px-3">
          <SalesChart data={chartData} />
        </div>
      </section>
    </div>
  );
}
