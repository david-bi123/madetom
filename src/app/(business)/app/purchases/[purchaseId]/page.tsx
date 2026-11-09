import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments, purchaseItems, purchases, suppliers, users } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMinor, formatMoney, toMinor } from "@/lib/format";
import { PageHeader, SectionHeading, StatCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ purchaseId: string }>;
}) {
  const context = await requireBusiness("purchases.view");
  const { purchaseId } = await params;
  const tenantId = context.tenant.id;

  const [row] = await db
    .select({
      id: purchases.id,
      reference: purchases.reference,
      status: purchases.status,
      subtotal: purchases.subtotal,
      taxAmount: purchases.taxAmount,
      total: purchases.total,
      amountPaid: purchases.amountPaid,
      notes: purchases.notes,
      createdAt: purchases.createdAt,
      receivedAt: purchases.receivedAt,
      supplierName: suppliers.name,
      supplierPhone: suppliers.phone,
      receivedByName: users.name,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(suppliers.id, purchases.supplierId))
    .leftJoin(users, eq(users.id, purchases.receivedBy))
    .where(and(eq(purchases.id, purchaseId), eq(purchases.tenantId, tenantId)))
    .limit(1);

  if (!row) notFound();

  const [items, paymentRows] = await Promise.all([
    db
      .select()
      .from(purchaseItems)
      .where(and(eq(purchaseItems.purchaseId, row.id), eq(purchaseItems.tenantId, tenantId))),
    db
      .select()
      .from(payments)
      .where(and(eq(payments.purchaseId, row.id), eq(payments.tenantId, tenantId))),
  ]);

  const outstanding = Math.max(0, toMinor(row.total) - toMinor(row.amountPaid));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/app/purchases" />}
          nativeButton={false}
          className="-ml-2"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All purchases
        </Button>
      </div>

      <PageHeader
        eyebrow={row.supplierName}
        title={row.reference}
        description={`Received ${formatDate(row.receivedAt ?? row.createdAt, "datetime")}${
          row.receivedByName ? ` by ${row.receivedByName}` : ""
        }.`}
        actions={<StatusBadge status={row.status} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={formatMoney(row.total)} />
        <StatCard label="Paid" value={formatMoney(row.amountPaid)} tone="gold" />
        <StatCard label="Outstanding" value={formatMinor(outstanding)} />
        <StatCard label="Lines" value={String(items.length)} />
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border/80 px-4 py-3.5">
          <SectionHeading title="Items received" description="What was added to stock at this branch." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/45">
                <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Product</th>
                <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Quantity</th>
                <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Unit cost</th>
                <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 text-[12.5px] font-medium text-foreground">
                    {item.nameSnapshot}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] tabular">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] tabular text-muted-foreground">
                    {formatMoney(item.unitCost)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                    {formatMoney(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/45">
                <td className="px-4 py-3 text-[12px] font-semibold" colSpan={3}>
                  Subtotal
                </td>
                <td className="px-4 py-3 text-right font-mono text-[12px] font-semibold tabular">
                  {formatMoney(row.subtotal)}
                </td>
              </tr>
              <tr className="border-t border-border/60 bg-muted/25">
                <td className="px-4 py-2.5 text-[12px] font-semibold" colSpan={3}>
                  Tax
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-[12px] tabular">
                  {formatMoney(row.taxAmount)}
                </td>
              </tr>
              <tr className="border-t border-border bg-muted/45">
                <td className="px-4 py-3 text-[13px] font-semibold" colSpan={3}>
                  Total
                </td>
                <td className="px-4 py-3 text-right font-mono text-[13px] font-semibold tabular">
                  {formatMoney(row.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <SectionHeading title="Payments" description="How this purchase was paid for." />
          {paymentRows.length === 0 ? (
            <p className="mt-3 text-[12px] text-muted-foreground">
              No payment recorded — the supplier is extending credit.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {paymentRows.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="capitalize text-muted-foreground">
                    {payment.method}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </span>
                  <span className="font-mono font-medium tabular">
                    {formatMoney(payment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <SectionHeading title="Supplier" description="Who this purchase came from." />
          <dl className="mt-3 space-y-2 text-[12.5px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium text-foreground">{row.supplierName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-mono text-foreground">{row.supplierPhone ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Recorded</dt>
              <dd className="text-muted-foreground">{formatDate(row.createdAt, "datetime")}</dd>
            </div>
          </dl>
          {row.notes ? (
            <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
              {row.notes}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
