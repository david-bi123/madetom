import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, sales, users } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ReceiptText } from "lucide-react";
import Link from "next/link";

/** This screen reads request-time data, so it is a blocking route. */

export default async function SalesPage() {
  const context = await requireBusiness("sales.view");
  const saleRows = await db
    .select({
      saleId: sales.id,
      receiptNumber: sales.receiptNumber,
      customerName: customers.name,
      cashierName: users.name,
      status: sales.status,
      total: sales.total,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .leftJoin(users, eq(users.id, sales.cashierId))
    .where(and(eq(sales.tenantId, context.tenant.id), eq(sales.branchId, context.activeBranch.id)))
    .orderBy(desc(sales.createdAt))
    .limit(50);

  return (
    <div>
      <PageHeader
        eyebrow={context.activeBranch.name}
        title="Sales & receipts"
        description="Every sale at this branch with its receipt, customer and cashier. Refunds keep the stock ledger honest."
        actions={
          <Button render={<Link href="/app/pos" />} nativeButton={false}>
            New sale
          </Button>
        }
      />

      {saleRows.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <EmptyState
            icon={ReceiptText}
            title="No sales recorded yet"
            description="Record your first sale at the till and it will appear here with its receipt."
            action={
              <Button render={<Link href="/app/pos" />} nativeButton={false}>Open point of sale</Button>
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Receipt</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Customer</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Cashier</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Amount</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {saleRows.map((row) => (
                  <tr key={row.saleId} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/app/sales/${row.saleId}`} className="font-mono text-[12px] font-medium text-primary hover:underline">
                        {row.receiptNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[12.5px]">{row.customerName ?? "Walk-in customer"}</td>
                    <td className="px-4 py-3 text-[12.5px]">{row.cashierName ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">{formatMoney(row.total)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-[11.5px] text-muted-foreground">{formatDate(row.createdAt, "time")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
