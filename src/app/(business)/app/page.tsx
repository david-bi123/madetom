import Link from "next/link";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Package,
  ReceiptText,
  ScanBarcode,
  ShoppingBag,
  TriangleAlert,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  customers,
  payments,
  products,
  productStock,
  saleItems,
  sales,
  tenantMemberships,
  users,
} from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatDate, lastNDays, dayKey } from "@/lib/dates";
import { formatMoney, formatNumber, percent } from "@/lib/format";
import { PERMISSION_CATALOG } from "@/lib/permissions";
import { PageHeader, StatCard, SectionHeading, EmptyState, InlineHint } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SalesChart, type SalesChartPoint } from "@/components/charts/sales-chart";
import { hasFeature } from "@/lib/subscription/entitlements";

/** The dashboard reads live tenant data, so it is a blocking route. */

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "Mobile Money",
  bank: "Bank transfer",
  card: "Card",
  credit: "Credit",
};

function trendPercent(today: number, yesterday: number): number {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return ((today - yesterday) / yesterday) * 100;
}

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Accra",
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const context = await requireBusiness("dashboard.view");
  const params = await searchParams;
  const canSeeReports = context.permissions.has("reports.view");
  const canManageProducts = context.permissions.has("products.manage");
  const profitAccess = await hasFeature(context.tenant.id, "reports.profit");
  const canSeeProfit = canSeeReports && profitAccess.allowed;
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));
  const branchId = context.activeBranch.id;
  const tenantId = context.tenant.id;

  const baseSaleFilter = and(
    eq(sales.tenantId, tenantId),
    eq(sales.branchId, branchId),
    eq(sales.status, "completed"),
  );

  const [todayStats, yesterdayStats, cogsToday, itemsToday, lowStockRows, lowStockCountRow, chartRows, recentSales, paymentRows, topProducts, activeProductCount, totalSalesCount, staffCount] =
    await Promise.all([
      db
        .select({
          revenue: sql<string>`coalesce(sum(${sales.total} - ${sales.taxAmount}), 0)`,
          total: sql<string>`coalesce(sum(${sales.total}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(sales)
        .where(and(baseSaleFilter, gte(sales.createdAt, todayStart), lte(sales.createdAt, todayEnd)))
        .then((rows) => rows[0]),
      db
        .select({
          revenue: sql<string>`coalesce(sum(${sales.total} - ${sales.taxAmount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(sales)
        .where(and(baseSaleFilter, gte(sales.createdAt, yesterdayStart), lte(sales.createdAt, yesterdayEnd)))
        .then((rows) => rows[0]),
      db
        .select({
          value: sql<string>`coalesce(sum(${saleItems.unitCost} * ${saleItems.quantity}), 0)`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(sales.id, saleItems.saleId))
        .where(and(baseSaleFilter, gte(sales.createdAt, todayStart), lte(sales.createdAt, todayEnd)))
        .then((rows) => rows[0]),
      db
        .select({ value: sql<number>`coalesce(sum(${saleItems.quantity}), 0)` })
        .from(saleItems)
        .innerJoin(sales, eq(sales.id, saleItems.saleId))
        .where(and(baseSaleFilter, gte(sales.createdAt, todayStart), lte(sales.createdAt, todayEnd)))
        .then((rows) => rows[0]),
      db
        .select({
          productId: products.id,
          name: products.name,
          sku: products.sku,
          unit: products.unit,
          quantity: productStock.quantity,
          reorderLevel: productStock.reorderLevel,
        })
        .from(productStock)
        .innerJoin(products, eq(products.id, productStock.productId))
        .where(
          and(
            eq(productStock.tenantId, tenantId),
            eq(productStock.branchId, branchId),
            eq(products.status, "active"),
            eq(products.trackInventory, true),
            sql`${productStock.quantity} <= ${productStock.reorderLevel}`,
          ),
        )
        .orderBy(productStock.quantity, products.name)
        .limit(5),
      db
        .select({ value: count() })
        .from(productStock)
        .innerJoin(products, eq(products.id, productStock.productId))
        .where(
          and(
            eq(productStock.tenantId, tenantId),
            eq(productStock.branchId, branchId),
            eq(products.status, "active"),
            eq(products.trackInventory, true),
            sql`${productStock.quantity} <= ${productStock.reorderLevel}`,
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({
          day: sql<string>`date_format(${sales.createdAt}, '%Y-%m-%d')`.as("day"),
          revenue: sql<string>`coalesce(sum(${sales.total} - ${sales.taxAmount}), 0)`,
          transactions: sql<number>`count(*)`,
        })
        .from(sales)
        .where(and(baseSaleFilter, gte(sales.createdAt, startOfDay(subDays(now, 13)))))
        // Group by the selected alias. TiDB runs with ONLY_FULL_GROUP_BY and
        // compares expressions literally, so repeating the date_format() call
        // (rendered with a table prefix here but without one in the select
        // list) is rejected as "not in GROUP BY".
        .groupBy(sql`day`),
      db
        .select({
          id: sales.id,
          receiptNumber: sales.receiptNumber,
          total: sales.total,
          status: sales.status,
          createdAt: sales.createdAt,
          customerName: customers.name,
          cashierName: users.name,
        })
        .from(sales)
        .leftJoin(customers, eq(customers.id, sales.customerId))
        .leftJoin(users, eq(users.id, sales.cashierId))
        .where(and(eq(sales.tenantId, tenantId), eq(sales.branchId, branchId)))
        .orderBy(desc(sales.createdAt))
        .limit(6),
      db
        .select({
          method: payments.method,
          total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
        })
        .from(payments)
        .innerJoin(sales, eq(sales.id, payments.saleId))
        .where(
          and(
            eq(payments.tenantId, tenantId),
            eq(sales.branchId, branchId),
            eq(sales.status, "completed"),
            gte(payments.createdAt, startOfDay(subDays(now, 29))),
          ),
        )
        .groupBy(payments.method),
      db
        .select({
          name: saleItems.nameSnapshot,
          quantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
          revenue: sql<string>`coalesce(sum(${saleItems.lineTotal}), 0)`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(sales.id, saleItems.saleId))
        .where(and(baseSaleFilter, gte(sales.createdAt, startOfDay(subDays(now, 29)))))
        .groupBy(saleItems.nameSnapshot)
        .orderBy(desc(sql`coalesce(sum(${saleItems.quantity}), 0)`))
        .limit(5),
      db
        .select({ value: count() })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.status, "active")))
        .then((rows) => rows[0]),
      db
        .select({ value: count() })
        .from(sales)
        .where(and(eq(sales.tenantId, tenantId), eq(sales.status, "completed")))
        .then((rows) => rows[0]),
      db
        .select({ value: count() })
        .from(tenantMemberships)
        .where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.status, "active")))
        .then((rows) => rows[0]),
    ]);

  const netRevenue = Number(todayStats?.revenue ?? 0);
  const transactionCount = Number(todayStats?.count ?? 0);
  const itemsSold = Number(itemsToday?.value ?? 0);
  const cogs = Number(cogsToday?.value ?? 0);
  const grossProfit = netRevenue - cogs;
  const margin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  const averageSale = transactionCount > 0 ? netRevenue / transactionCount : 0;
  const yesterdayRevenue = Number(yesterdayStats?.revenue ?? 0);
  const yesterdayCount = Number(yesterdayStats?.count ?? 0);
  const lowStockCount = Number(lowStockCountRow?.value ?? 0);

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

  const paymentTotal = paymentRows.reduce((sum, row) => sum + Number(row.total), 0);

  const productCount = Number(activeProductCount?.value ?? 0);
  const salesCount = Number(totalSalesCount?.value ?? 0);
  const teamCount = Number(staffCount?.value ?? 0);
  const showChecklist = productCount === 0 || salesCount === 0;
  const deniedPermission = typeof params.denied === "string" ? params.denied : undefined;
  const deniedLabel = PERMISSION_CATALOG.find((item) => item.key === deniedPermission)?.label;

  return (
    <div>
      <PageHeader
        eyebrow={`${context.activeBranch.name} · ${formatDate(now, "long")}`}
        title={`${greeting()}, ${context.user.name.split(" ")[0]}.`}
        description="Here is today's trade at a glance, with the stock and money decisions that need you."
        actions={
          <>
            {canManageProducts ? (
              <Button variant="outline" render={<Link href="/app/products/new" />} nativeButton={false}>
                <Package className="size-4" aria-hidden />
                Add product
              </Button>
            ) : null}
            <Button render={<Link href="/app/pos" />} nativeButton={false}>
              <ScanBarcode className="size-4" aria-hidden />
              New sale
            </Button>
          </>
        }
      />

      {params.setup === "complete" ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#cfe7d8] bg-success-soft px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <div className="text-[12.5px] leading-relaxed text-[#12623c]">
            <p className="font-semibold">Your workspace is active.</p>
            <p className="mt-0.5">
              {context.activeBranch.name} is ready. Add your products, invite the team, then take
              your first sale.
            </p>
          </div>
        </div>
      ) : null}

      {params.joined === "1" ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#cfe7d8] bg-success-soft px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <p className="text-[12.5px] leading-relaxed text-[#12623c]">
            <span className="font-semibold">Welcome to {context.tenant.name}.</span> Your account is
            ready at {context.activeBranch.name}.
          </p>
        </div>
      ) : null}

      {deniedLabel ? (
        <div className="mb-4">
          <InlineHint tone="warning">
            Your role does not include <strong>{deniedLabel.toLowerCase()}</strong>. Ask the owner
            if you need this access.
          </InlineHint>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Net revenue today"
          value={formatMoney(netRevenue)}
          icon={CircleDollarSign}
          tone="gold"
          trend={{ value: trendPercent(netRevenue, yesterdayRevenue) }}
          hint="vs yesterday"
        />
        <StatCard
          label="Transactions"
          value={formatNumber(transactionCount)}
          icon={ReceiptText}
          trend={{ value: trendPercent(transactionCount, yesterdayCount) }}
          hint="sales today"
        />
        <StatCard
          label="Items sold"
          value={formatNumber(itemsSold)}
          icon={ShoppingBag}
          hint={`Average sale ${formatMoney(averageSale)}`}
        />
        {canSeeProfit ? (
          <StatCard
            label="Gross profit"
            value={formatMoney(grossProfit)}
            icon={ClipboardCheck}
            hint={`${percent(margin)} margin`}
            tone={grossProfit < 0 ? "critical" : "default"}
          />
        ) : (
          <StatCard
            label="Stock alerts"
            value={formatNumber(lowStockCount)}
            icon={TriangleAlert}
            tone={lowStockCount > 0 ? "warning" : "default"}
            hint="at or below reorder level"
            href="/app/inventory"
          />
        )}
      </div>

      {showChecklist ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 border-b border-border/80 bg-[#fbf9f1] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[#5f4a15]">
                <ClipboardCheck className="size-4 text-[#a97918]" aria-hidden />
                Finish setting up {context.tenant.name}
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#80704b]">
                Three small steps and your counter is ready for trade.
              </p>
            </div>
            <span className="text-[11px] font-medium text-[#80704b]">
              {[productCount > 0, teamCount > 1, salesCount > 0].filter(Boolean).length} of 3 done
            </span>
          </div>
          <div className="grid divide-y divide-border/80 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                done: productCount > 0,
                icon: Package,
                title: "Add your first products",
                body: productCount > 0 ? `${productCount} active products` : "Build the catalogue with prices and stock.",
                href: "/app/products/new",
                action: "Add product",
              },
              {
                done: teamCount > 1,
                icon: Users,
                title: "Invite your team",
                body: teamCount > 1 ? `${teamCount} active people` : "Give managers and cashiers their own access.",
                href: "/app/staff",
                action: "Invite staff",
              },
              {
                done: salesCount > 0,
                icon: ScanBarcode,
                title: "Take a sale",
                body: salesCount > 0 ? `${salesCount} sales recorded` : "Try the till and print your first receipt.",
                href: "/app/pos",
                action: "Open till",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 px-4 py-4">
                <span
                  className={
                    item.done
                      ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success"
                      : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                  }
                >
                  {item.done ? <CheckCircle2 className="size-4" aria-hidden /> : <item.icon className="size-4" aria-hidden />}
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{item.body}</p>
                  {!item.done ? (
                    <Link
                      href={item.href}
                      className="mt-1.5 inline-flex items-center gap-1 rounded text-[11.5px] font-medium text-primary hover:underline"
                    >
                      {item.action}
                      <ArrowRight className="size-3" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
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

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <SectionHeading
                title="Recent sales"
                description={`Latest activity at ${context.activeBranch.name}.`}
              />
              <Button variant="ghost" size="sm" render={<Link href="/app/sales" />} nativeButton={false}>
                View all
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            </div>
            {recentSales.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="No sales yet"
                description="Open the till and record the first sale for this branch."
                action={
                  <Button render={<Link href="/app/pos" />} size="sm" nativeButton={false}>
                    <ScanBarcode className="size-4" />
                    Open point of sale
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border/80 border-t border-border/80">
                {recentSales.map((sale) => (
                  <Link
                    key={sale.id}
                    href={`/app/sales/${sale.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                      <ReceiptText className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium">
                        {sale.customerName ?? "Walk-in customer"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {sale.receiptNumber} · {sale.cashierName ?? "Cashier"} ·{" "}
                        {formatDate(sale.createdAt, "time")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {sale.status === "refunded" ? <StatusBadge status="refunded" /> : null}
                      <span className="font-mono text-[12px] font-medium tabular">
                        {formatMoney(sale.total)}
                      </span>
                      <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <SectionHeading title="Low stock" description="At or below reorder level." />
              <Link
                href="/app/inventory"
                className="rounded text-[11.5px] font-medium text-primary hover:underline"
              >
                Inventory
              </Link>
            </div>
            {lowStockRows.length === 0 ? (
              <div className="flex items-start gap-2.5 border-t border-border/80 px-4 py-6">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <div>
                  <p className="text-[12.5px] font-medium">Stock looks healthy</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    Every tracked product is above its reorder level at this branch.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/80 border-t border-border/80">
                {lowStockRows.map((item) => (
                  <Link
                    key={item.productId}
                    href={`/app/products/${item.productId}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium">{item.name}</p>
                      <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                        {item.sku} · reorder at {item.reorderLevel}
                      </p>
                    </div>
                    <span
                      className={
                        item.quantity <= 0
                          ? "rounded-full bg-danger-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-destructive tabular"
                          : "rounded-full bg-warning-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-warning tabular"
                      }
                    >
                      {item.quantity} {item.unit}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {lowStockCount > lowStockRows.length ? (
              <div className="border-t border-border/80 px-4 py-2.5">
                <Link href="/app/inventory" className="text-[11.5px] font-medium text-primary hover:underline">
                  {lowStockCount - lowStockRows.length} more low-stock items
                </Link>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card px-4 py-4 shadow-[var(--shadow-card)]">
            <SectionHeading title="How customers paid" description="Last 30 days at this branch." />
            {paymentRows.length === 0 ? (
              <p className="mt-3 text-[12px] text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {paymentRows.map((row) => {
                  const share = paymentTotal > 0 ? (Number(row.total) / paymentTotal) * 100 : 0;
                  return (
                    <div key={row.method}>
                      <div className="flex items-center justify-between gap-2 text-[11.5px]">
                        <span className="text-muted-foreground">{PAYMENT_LABELS[row.method] ?? row.method}</span>
                        <span className="font-mono font-medium tabular">{formatMoney(row.total)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(share, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="px-4 py-3.5">
              <SectionHeading title="Top sellers" description="Units sold in the last 30 days." />
            </div>
            {topProducts.length === 0 ? (
              <p className="border-t border-border/80 px-4 py-5 text-[12px] text-muted-foreground">
                Products will rank here as sales come in.
              </p>
            ) : (
              <ol className="divide-y divide-border/80 border-t border-border/80">
                {topProducts.map((item, index) => (
                  <li key={item.name} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted font-mono text-[10px] font-semibold text-muted-foreground tabular">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{item.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular">
                      {Number(item.quantity)} sold
                    </span>
                    <span className="shrink-0 font-mono text-[11px] font-medium tabular">
                      {formatMoney(item.revenue)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { href: "/app/pos", label: "Open the till", icon: ScanBarcode, hint: "Scan, sell and print" },
          { href: "/app/products", label: "Manage products", icon: Boxes, hint: "Prices, stock and categories" },
          { href: "/app/reports", label: "See the numbers", icon: CircleDollarSign, hint: "Revenue, profit and exports" },
        ]
          .filter((item) => {
            if (item.href === "/app/reports") return canSeeReports;
            if (item.href === "/app/products") return context.permissions.has("products.view");
            return context.permissions.has("pos.use");
          })
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)] transition-colors hover:border-[#cdd8cf]"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/7 text-primary">
                <item.icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold">{item.label}</span>
                <span className="block text-[11px] text-muted-foreground">{item.hint}</span>
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
      </div>
    </div>
  );
}

