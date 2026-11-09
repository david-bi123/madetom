import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productStock, productVariants, products as productsTable, stockMovements, variantStock } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { PageHeader, EmptyState, SectionHeading } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SuccessBanner } from "@/components/ui/success-banner";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Boxes, History, SlidersHorizontal } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ adjusted?: string; transferred?: string }>;
}) {
  const context = await requireBusiness("inventory.view");
  const tenantId = context.tenant.id;
  const branchId = context.activeBranch.id;
  const { adjusted, transferred } = await searchParams;

  const [rows, movements, variantRows] = await Promise.all([
    db
      .select({
        productId: productsTable.id,
        name: productsTable.name,
        sku: productsTable.sku,
        unit: productsTable.unit,
        quantity: productStock.quantity,
        reorderLevel: productStock.reorderLevel,
        costPrice: productsTable.costPrice,
        sellingPrice: productsTable.sellingPrice,
        trackInventory: productsTable.trackInventory,
        status: productsTable.status,
      })
      .from(productStock)
      .innerJoin(
        productsTable,
        and(
          eq(productStock.productId, productsTable.id),
          eq(productStock.tenantId, tenantId),
          eq(productStock.branchId, branchId),
        ),
      )
      .where(
        and(
          eq(productStock.tenantId, tenantId),
          eq(productStock.branchId, branchId),
          eq(productsTable.trackInventory, true),
        ),
      )
      .orderBy(asc(productsTable.name)),
    db
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        quantityDelta: stockMovements.quantityDelta,
        balanceAfter: stockMovements.balanceAfter,
        referenceLabel: stockMovements.referenceLabel,
        note: stockMovements.note,
        createdAt: stockMovements.createdAt,
        productName: productsTable.name,
      })
      .from(stockMovements)
      .innerJoin(productsTable, eq(productsTable.id, stockMovements.productId))
      .where(and(eq(stockMovements.tenantId, tenantId), eq(stockMovements.branchId, branchId)))
      .orderBy(desc(stockMovements.createdAt))
      .limit(15),
    db
      .select({
        productId: productsTable.id,
        name: productsTable.name,
        variantName: productVariants.name,
        sku: productVariants.sku,
        unit: productsTable.unit,
        quantity: variantStock.quantity,
        reorderLevel: variantStock.reorderLevel,
        status: productVariants.status,
      })
      .from(productVariants)
      .innerJoin(productsTable, eq(productsTable.id, productVariants.productId))
      .innerJoin(
        variantStock,
        and(
          eq(variantStock.variantId, productVariants.id),
          eq(variantStock.tenantId, tenantId),
          eq(variantStock.branchId, branchId),
        ),
      )
      .where(
        and(
          eq(productVariants.tenantId, tenantId),
          eq(productVariants.status, "active"),
          eq(productsTable.status, "active"),
        ),
      )
      .orderBy(asc(productsTable.name), asc(productVariants.name)),
  ]);

  const variantProductIds = new Set(variantRows.map((row) => row.productId));
  const inventoryRows = [
    ...rows
      .filter((row) => !variantProductIds.has(row.productId))
      .map((row) => ({
        key: row.productId,
        productId: row.productId,
        name: row.name,
        sku: row.sku,
        unit: row.unit,
        quantity: row.quantity,
        reorderLevel: row.reorderLevel,
        status: row.status,
      })),
    ...variantRows.map((row) => ({
      key: `${row.productId}:${row.sku}`,
      productId: row.productId,
      name: `${row.name} · ${row.variantName}`,
      sku: row.sku,
      unit: row.unit,
      quantity: row.quantity,
      reorderLevel: row.reorderLevel,
      status: row.status,
    })),
  ];

  const lowStock = inventoryRows.filter((row) => row.quantity <= row.reorderLevel);
  const totalUnits = inventoryRows.reduce((sum, row) => sum + row.quantity, 0);

  const canAdjust = context.permissions.has("inventory.adjust");
  const canTransfer = context.permissions.has("inventory.transfer");
  const hasOtherBranch = context.branches.some((branch) => branch.id !== branchId);

  return (
    <div>
      <PageHeader
        eyebrow={context.activeBranch.name}
        title="Inventory"
        description={`${inventoryRows.length} tracked products at this branch · ${totalUnits} units on hand.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canAdjust ? (
              <Button render={<Link href="/app/inventory/adjust" />} nativeButton={false}>
                <SlidersHorizontal className="size-4" aria-hidden />
                Adjust stock
              </Button>
            ) : null}
            {canTransfer ? (
              <Button
                variant="outline"
                render={<Link href="/app/inventory/transfer" />}
                nativeButton={false}
              >
                <ArrowLeftRight className="size-4" aria-hidden />
                Transfer stock
              </Button>
            ) : null}
          </div>
        }
      />

      {adjusted ? (
        <SuccessBanner message="Stock adjusted. The change is in your ledger and stock alerts have been refreshed." />
      ) : null}
      {transferred ? (
        <SuccessBanner message="Transfer recorded. Both branch balances have been updated." />
      ) : null}

      {inventoryRows.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <EmptyState
            icon={Boxes}
            title="No tracked inventory"
            description="Products with stock tracking enabled will appear here with their branch quantities."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Product</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">SKU</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">On hand</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Reorder at</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {inventoryRows.map((row) => {
                  const low = row.quantity <= row.reorderLevel;
                  return (
                    <tr key={row.key} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/products/${row.productId}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{row.sku}</td>
                      <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                        {row.quantity} {row.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                        {row.reorderLevel}
                      </td>
                      <td className="px-4 py-3">
                        {low ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2 py-0.5 text-[10.5px] font-semibold text-warning tabular">
                            Low stock
                          </span>
                        ) : (
                          <StatusBadge status={row.status} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lowStock.length > 0 ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          {lowStock.length} product{lowStock.length === 1 ? "" : "s"} at or below reorder level at this
          branch.
        </p>
      ) : null}

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border/80 px-4 py-3.5">
          <SectionHeading
            title="Stock movements"
            description="The 15 most recent entries in this branch's ledger."
          />
        </div>
        {movements.length === 0 ? (
          <div className="px-4 py-5">
            <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <History className="size-3.5" aria-hidden />
              No movements recorded yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/80">
            {movements.map((movement) => (
              <li key={movement.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-foreground">
                    {movement.productName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {movement.referenceLabel ?? movement.type}
                    {movement.note ? ` · ${movement.note}` : ""} ·{" "}
                    {formatDate(movement.createdAt, "datetime")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`font-mono text-[12px] font-medium tabular ${
                      movement.quantityDelta < 0 ? "text-destructive" : "text-success"
                    }`}
                  >
                    {movement.quantityDelta > 0 ? "+" : ""}
                    {movement.quantityDelta}
                  </p>
                  <p className="font-mono text-[10.5px] text-muted-foreground tabular">
                    {movement.balanceAfter} left
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canTransfer && !hasOtherBranch ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Transfers need a second branch. Add one from Settings to move stock between locations.
        </p>
      ) : null}
    </div>
  );
}
