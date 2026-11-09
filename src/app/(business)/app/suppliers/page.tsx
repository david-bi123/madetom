import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, suppliers as suppliersTable } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { PageHeader, EmptyState, StatCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SuccessBanner } from "@/components/ui/success-banner";
import { Button } from "@/components/ui/button";
import { ArchiveSupplierButton } from "@/components/suppliers/archive-supplier-button";
import { Plus, Truck } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const context = await requireBusiness("suppliers.view");
  const tenantId = context.tenant.id;
  const canManage = context.permissions.has("suppliers.manage");
  const { created } = await searchParams;

  const [supplierRows, productRows] = await Promise.all([
    db
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.tenantId, tenantId))
      .orderBy(asc(suppliersTable.name)),
    db
      .select({ supplierId: products.supplierId })
      .from(products)
      .where(eq(products.tenantId, tenantId)),
  ]);

  const productsBySupplier = new Map<string, number>();
  for (const row of productRows) {
    if (!row.supplierId) continue;
    productsBySupplier.set(row.supplierId, (productsBySupplier.get(row.supplierId) ?? 0) + 1);
  }

  const active = supplierRows.filter((supplier) => supplier.status === "active");
  const withContact = supplierRows.filter((supplier) => supplier.phone || supplier.email).length;

  return (
    <div>
      <PageHeader
        eyebrow={context.activeBranch.name}
        title="Suppliers"
        description="Who you buy from, with contact details and the products they supply."
        actions={
          canManage ? (
            <Button render={<Link href="/app/suppliers/new" />} nativeButton={false}>
              <Plus className="size-4" aria-hidden />
              Add supplier
            </Button>
          ) : undefined
        }
      />

      {created ? <SuccessBanner message="Supplier added to this workspace." /> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active suppliers" value={String(active.length)} icon={Truck} />
        <StatCard label="With contact details" value={String(withContact)} tone="gold" />
        <StatCard label="Archived" value={String(supplierRows.length - active.length)} />
        <StatCard label="Products linked" value={String(productRows.length)} />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {supplierRows.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No suppliers yet"
            description="Add the traders and distributors you buy stock from to keep purchases traceable."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Supplier</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Contact</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Products</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Status</th>
                  {canManage ? (
                    <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      Action
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {supplierRows.map((supplier) => (
                  <tr key={supplier.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{supplier.name}</div>
                      {supplier.contactName ? (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {supplier.contactName}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                      <div>{supplier.phone ?? "—"}</div>
                      <div className="mt-0.5 text-[11px]">{supplier.email ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                      {productsBySupplier.get(supplier.id) ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={supplier.status} />
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3 text-right">
                        <ArchiveSupplierButton supplierId={supplier.id} name={supplier.name} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
