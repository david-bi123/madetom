import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, saleItems, sales, users } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMinor, formatMoney, formatNumber, toMinor } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { SaleRefundButton } from "@/components/sales/sale-refund-button";
import { Printer } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

type SaleDetailPageProps = {
  params: Promise<{ saleId: string }>;
};

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const { saleId } = await params;
  const context = await requireBusiness("sales.view");
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.tenantId, context.tenant.id), eq(sales.branchId, context.activeBranch.id)))
    .limit(1);

  if (!sale) {
    return (
      <div className="max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="font-heading text-[22px] font-semibold">Receipt not found</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">This sale is not part of your workspace.</p>
        <Button render={<Link href="/app/sales" />} className="mt-6" nativeButton={false}>
          Back to sales
        </Button>
      </div>
    );
  }

  const items = await db
    .select()
    .from(saleItems)
    .where(and(eq(saleItems.saleId, sale.id), eq(saleItems.tenantId, sale.tenantId)));
  const customerRows = sale.customerId
    ? await db.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1)
    : [];
  const customer = customerRows[0] ?? null;
  const cashier = await db.select().from(users).where(eq(users.id, sale.cashierId)).limit(1);

  const discountMinor = toMinor(sale.discountAmount);
  const subtotalMinor = items.reduce((sum, item) => sum + toMinor(item.lineTotal), 0) + discountMinor;
  const taxMinor = items.reduce((sum, item) => sum + toMinor(item.taxAmount), 0);
  const totalMinor = toMinor(sale.total);

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow={context.activeBranch.name}
        title={`Receipt ${sale.receiptNumber}`}
        description={formatDate(sale.createdAt, "datetime")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" render={<Link href={`/app/sales/${sale.id}/print`} />} nativeButton={false}>
              <Printer className="size-3.5" aria-hidden />
              Print receipt
            </Button>
            <Button variant="outline" render={<Link href="/app/sales" />} nativeButton={false}>
              Back to sales
            </Button>
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-card)]">
        <div className="border-b border-border/80 bg-[#0b1f19] px-5 py-4 text-[#f4f7f3]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-heading text-[24px] leading-none font-semibold tracking-[-0.03em] text-[#f4f7f3]">
                madetom
              </p>
              <p className="mt-1 text-[10px] tracking-[0.14em] text-[#9eb5a8] uppercase">Your trade, under control</p>
            </div>
            <div className="text-right">
              <StatusBadge status={sale.status} />
              {sale.paymentStatus === "partial" ? <span className="mt-2 block text-[11px] text-[#e7cb8b]">Part paid</span> : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 text-[11px] text-[#a9bdb1]">
            <div>
              <p className="text-[#9eb5a8]">Branch</p>
              <p className="text-[12.5px] font-medium text-[#e8f0ea]">{context.activeBranch.name}</p>
            </div>
            <div>
              <p className="text-[#9eb5a8]">Cashier</p>
              <p className="text-[12.5px] font-medium text-[#e8f0ea]">{cashier[0]?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-[#9eb5a8]">Customer</p>
              <p className="text-[12.5px] font-medium text-[#e8f0ea]">{customer?.name ?? "Walk-in customer"}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          {items.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No sale lines were recorded for this receipt.</p>
          ) : (
            <ol className="divide-y divide-border/80">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold">{item.nameSnapshot}</p>
                    <p className="mt-0.5 text-[10.5px] text-muted-foreground tabular">
                      {item.quantity} × {formatMoney(item.unitPrice)} · cost {formatMoney(item.unitCost)}
                    </p>
                  </div>
                  <span className="font-mono text-[12px] font-medium tabular">{formatMoney(item.lineTotal)}</span>
                </li>
              ))}
            </ol>
          )}

          <dl className="mt-4 space-y-1.5 rounded-lg bg-[#fbfcf9] p-3.5 text-[12px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="font-mono tabular">{formatMinor(subtotalMinor)}</dd>
            </div>
            {discountMinor > 0 ? (
              <div className="flex items-center justify-between text-[#a4671a]">
                <dt>Discount</dt>
                <dd className="font-mono tabular">−{formatMinor(discountMinor)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-muted-foreground">
              <dt>Tax</dt>
              <dd className="font-mono tabular">{formatMinor(taxMinor)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-border/70 pt-1.5 font-heading text-[15px] font-semibold text-foreground tabular">
              <dt>Total</dt>
              <dd>{formatMinor(totalMinor)}</dd>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <dt>Amount paid</dt>
              <dd className="font-mono tabular">{formatMoney(sale.amountPaid)}</dd>
            </div>
            {Number(sale.changeDue) > 0 ? (
              <div className="flex items-center justify-between text-success">
                <dt>Change due</dt>
                <dd className="font-mono tabular">{formatMoney(sale.changeDue)}</dd>
              </div>
            ) : null}
            {Number(sale.refundAmount) > 0 ? (
              <div className="flex items-center justify-between text-destructive">
                <dt>Refunded</dt>
                <dd className="font-mono tabular">{formatMoney(sale.refundAmount)}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="border-t border-border/80 bg-[#fbfcf9] px-5 py-3.5 text-[11px] text-muted-foreground">
          <p>Payment {sale.paymentStatus === "partial" ? "partially paid" : "settled"} · Method recorded in the ledger</p>
          <p className="mt-1">
            {formatNumber(items.reduce((sum, item) => sum + item.quantity, 0))} items across this receipt.
          </p>
        </div>
      </div>

      {sale.status === "completed" && context.permissions.has("sales.refund") ? (
        <div className="mt-4">
          <SaleRefundButton saleId={sale.id} refundAmountMinor={toMinor(sale.total)} />
        </div>
      ) : null}
    </div>
  );
}
