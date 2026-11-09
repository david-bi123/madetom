import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchases, suppliers } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMinor, formatMoney, toMinor } from "@/lib/format";
import { PageHeader, EmptyState, StatCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SuccessBanner } from "@/components/ui/success-banner";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingBag } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const context = await requireBusiness("purchases.view");
  const tenantId = context.tenant.id;
  const branchId = context.activeBranch.id;
  const canManage = context.permissions.has("purchases.manage");
  const { created } = await searchParams;

  const rows = await db
    .select({
      id: purchases.id,
      reference: purchases.reference,
      status: purchases.status,
      total: purchases.total,
      amountPaid: purchases.amountPaid,
      notes: purchases.notes,
      supplierName: suppliers.name,
      createdAt: purchases.createdAt,
      receivedAt: purchases.receivedAt,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(suppliers.id, purchases.supplierId))
    .where(and(eq(purchases.tenantId, tenantId), eq(purchases.branchId, branchId)))
    .orderBy(desc(purchases.createdAt));

  const totalSpend = rows.reduce((sum, row) => sum + toMinor(row.total), 0);
  const outstanding = rows.reduce(
    (sum, row) => sum + Math.max(0, toMinor(row.total) - toMinor(row.amountPaid)),
    0,
  );
  const receivedCount = rows.filter((row) => row.status === "received").length;

  return (
    <div>
      <PageHeader
        eyebrow={context.activeBranch.name}
        title="Purchases"
        description="Stock bought from suppliers, with what was received and what was paid."
        actions={
          canManage ? (
            <Button render={<Link href="/app/purchases/new" />} nativeButton={false}>
              <Plus className="size-4" aria-hidden />
              Record purchase
            </Button>
          ) : undefined
        }
      />

      {created ? (
        <SuccessBanner message="Purchase received. The stock is now in your inventory." />
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Purchases" value={String(rows.length)} icon={ShoppingBag} />
        <StatCard label="Received" value={String(receivedCount)} tone="gold" />
        <StatCard label="Total spent" value={formatMinor(totalSpend)} />
        <StatCard label="Outstanding" value={formatMinor(outstanding)} />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {rows.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No purchases recorded"
            description="Record what you buy so stock levels and profit stay accurate."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Reference</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Supplier</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Total</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Paid</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/purchases/${row.id}`}
                        className="font-mono text-[12px] font-medium text-foreground hover:underline"
                      >
                        {row.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[12.5px]">{row.supplierName}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                      {formatMoney(row.total)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                      {formatMoney(row.amountPaid)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-[11.5px] text-muted-foreground">
                      {formatDate(row.receivedAt ?? row.createdAt, "short")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/45">
                  <td className="px-4 py-3 text-[12px] font-semibold" colSpan={2}>
                    Total purchased
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] font-semibold tabular">
                    {formatMinor(totalSpend)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
