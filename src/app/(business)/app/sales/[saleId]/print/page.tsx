import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, customers, saleItems, sales, users } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMinor, formatMoney, toMinor } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PrintTrigger } from "@/components/sales/print-trigger";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function PrintReceiptPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const context = await requireBusiness("sales.view");
  const { saleId } = await params;

  const [sale] = await db
    .select()
    .from(sales)
    .where(
      and(
        eq(sales.id, saleId),
        eq(sales.tenantId, context.tenant.id),
        eq(sales.branchId, context.activeBranch.id),
      ),
    )
    .limit(1);

  if (!sale) notFound();

  const [items, customerRows, cashierRows, branchRows] = await Promise.all([
    db
      .select()
      .from(saleItems)
      .where(and(eq(saleItems.saleId, sale.id), eq(saleItems.tenantId, context.tenant.id))),
    sale.customerId
      ? db.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1)
      : Promise.resolve([]),
    db.select().from(users).where(eq(users.id, sale.cashierId)).limit(1),
    db.select().from(branches).where(eq(branches.id, sale.branchId)).limit(1),
  ]);

  const customer = customerRows[0] ?? null;
  const cashier = cashierRows[0] ?? null;
  const branch = branchRows[0] ?? null;

  const discountMinor = toMinor(sale.discountAmount);
  const subtotalMinor = items.reduce((sum, item) => sum + toMinor(item.lineTotal), 0) + discountMinor;
  const taxMinor = items.reduce((sum, item) => sum + toMinor(item.taxAmount), 0);
  const totalMinor = toMinor(sale.total);

  return (
    <div className="receipt-page min-h-svh bg-[#f6f7f3] px-4 py-6 print:bg-white print:p-0">
      <PrintTrigger />

      <div className="no-print mx-auto mb-4 flex max-w-sm items-center justify-between gap-2">
        <Button variant="outline" size="sm" render={<Link href={`/app/sales/${sale.id}`} />} nativeButton={false}>
          Back to receipt
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          Print again
        </Button>
      </div>

      <article className="receipt-sheet mx-auto w-[80mm] max-w-full bg-white p-4 font-mono text-[11px] leading-snug text-black shadow-[var(--shadow-card)] print:shadow-none">
        <header className="text-center">
          <p className="font-heading text-[18px] font-semibold tracking-[-0.02em]">
            {context.tenant.name}
          </p>
          {branch?.address ? <p className="mt-0.5">{branch.address}</p> : null}
          {branch?.phone ? <p>{branch.phone}</p> : null}
          <p className="mt-1 text-[10px]">Receipt {sale.receiptNumber}</p>
        </header>

        <hr className="my-2 border-t border-dashed border-black/40" />

        <dl className="space-y-0.5">
          <div className="flex justify-between gap-2">
            <dt>Date</dt>
            <dd>{formatDate(sale.createdAt, "datetime")}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Branch</dt>
            <dd>{branch?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Served by</dt>
            <dd>{cashier?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Customer</dt>
            <dd className="truncate">{customer?.name ?? "Walk-in"}</dd>
          </div>
        </dl>

        <hr className="my-2 border-t border-dashed border-black/40" />

        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="font-normal">Item</th>
              <th className="text-right font-normal">Qty</th>
              <th className="text-right font-normal">Price</th>
              <th className="text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="pr-1">{item.nameSnapshot}</td>
                <td className="text-right tabular">{item.quantity}</td>
                <td className="text-right tabular">{formatMoney(item.unitPrice)}</td>
                <td className="text-right tabular">{formatMoney(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="my-2 border-t border-dashed border-black/40" />

        <dl className="space-y-0.5">
          <div className="flex justify-between gap-2">
            <dt>Subtotal</dt>
            <dd className="tabular">{formatMinor(subtotalMinor)}</dd>
          </div>
          {discountMinor > 0 ? (
            <div className="flex justify-between gap-2">
              <dt>Discount</dt>
              <dd className="tabular">−{formatMinor(discountMinor)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <dt>Tax</dt>
            <dd className="tabular">{formatMinor(taxMinor)}</dd>
          </div>
          <div className="flex justify-between gap-2 text-[13px] font-semibold">
            <dt>TOTAL</dt>
            <dd className="tabular">{formatMinor(totalMinor)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Paid</dt>
            <dd className="tabular">{formatMoney(sale.amountPaid)}</dd>
          </div>
          {Number(sale.changeDue) > 0 ? (
            <div className="flex justify-between gap-2">
              <dt>Change</dt>
              <dd className="tabular">{formatMoney(sale.changeDue)}</dd>
            </div>
          ) : null}
          {sale.status === "refunded" ? (
            <div className="mt-1 text-center font-semibold">*** REFUNDED ***</div>
          ) : null}
        </dl>

        <hr className="my-2 border-t border-dashed border-black/40" />

        <p className="text-center text-[10px]">
          Thank you for trading with {context.tenant.name}.
          <br />
          Powered by Madetom — Your trade, under control.
        </p>
      </article>
    </div>
  );
}
