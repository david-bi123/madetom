import Link from "next/link";
/* eslint-disable @next/next/no-img-element -- product images are arbitrary remote URLs */
import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { productCategories, productStock, products as productsTable } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SuccessBanner } from "@/components/ui/success-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Boxes, Download, Upload } from "lucide-react";
import { archiveProduct } from "./actions";

/** This screen reads request-time data, so it is a blocking route. */

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const context = await requireBusiness("products.view");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const categoryId = typeof params.categoryId === "string" && params.categoryId ? params.categoryId : null;
  const created = params.created === "1";
  const canManage = context.permissions.has("products.manage");
  const tenantId = context.tenant.id;
  const branchId = context.activeBranch.id;

  const [categories, productRows] = await Promise.all([
    db
      .select()
      .from(productCategories)
      .where(eq(productCategories.tenantId, tenantId))
      .orderBy(productCategories.name),
    db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        sku: productsTable.sku,
        barcode: productsTable.barcode,
        imageUrl: productsTable.imageUrl,
        categoryId: productsTable.categoryId,
        costPrice: productsTable.costPrice,
        sellingPrice: productsTable.sellingPrice,
        reorderLevel: productsTable.reorderLevel,
        unit: productsTable.unit,
        status: productsTable.status,
        quantity: productStock.quantity,
      })
      .from(productsTable)
      .innerJoin(
        productStock,
        and(
          eq(productStock.productId, productsTable.id),
          eq(productStock.tenantId, tenantId),
          eq(productStock.branchId, branchId),
        ),
      )
      .where(
        and(
          eq(productsTable.tenantId, tenantId),
          eq(productsTable.status, "active"),
          categoryId ? eq(productsTable.categoryId, categoryId) : undefined,
          query
            ? or(
                like(productsTable.name, `%${query}%`),
                like(productsTable.sku, `%${query}%`),
                like(productsTable.barcode ?? "", `%${query}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(productsTable.name)),
  ]);

  const filtered = query
    ? productRows.filter((row) => row.name.toLowerCase().includes(query.toLowerCase()) || row.sku.toLowerCase().includes(query.toLowerCase()))
    : productRows;

  return (
    <div>
      <PageHeader
        eyebrow={context.activeBranch.name}
        title="Products"
        description="The catalogue with cost, price, and stock at this branch."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" render={<a href="/api/products/export" />} nativeButton={false}>
              <Download className="size-4" aria-hidden />
              Export CSV
            </Button>
            {canManage ? (
              <>
                <Button variant="outline" render={<Link href="/app/products/import" />} nativeButton={false}>
                  <Upload className="size-4" aria-hidden />
                  Import
                </Button>
                <Button render={<Link href="/app/products/new" />} nativeButton={false}>
                  <Boxes className="size-4" aria-hidden />
                  New product
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {created ? <SuccessBanner message="Product created and added to your catalogue." /> : null}

      <form method="get" className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search name, SKU or barcode…"
            aria-label="Search products"
            className="h-9 rounded-lg text-[13px]"
          />
        </div>
        <div className="w-full sm:w-56">
          <NativeSelect
            name="categoryId"
            defaultValue={categoryId ?? ""}
            aria-label="Filter by category"
            className="h-9 rounded-lg text-[13px]"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9 sm:w-auto">
          Filter
        </Button>
      </form>

      {filtered.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <EmptyState
            icon={Boxes}
            title="No products found"
            description="Add your first product to start building the catalogue for this branch."
            action={
              canManage ? (
                <Button render={<Link href="/app/products/new" />} size="sm" nativeButton={false}>
                  Add product
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Product</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Category</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Cost</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Price</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Stock</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Status</th>
                  {canManage ? <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {filtered.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="size-9 shrink-0 rounded-lg border border-border object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <Link href={`/app/products/${product.id}`} className="font-medium text-foreground hover:underline">
                            {product.name}
                          </Link>
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{categoryName(context, product.categoryId, categories)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">{formatMoney(product.costPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">{formatMoney(product.sellingPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                      {product.quantity} {product.unit}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={product.status} />
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" render={<Link href={`/app/products/${product.id}`} />} nativeButton={false}>
                            Edit
                          </Button>
                          {product.status === "active" ? (
                            <form action={archiveProduct}>
                              <input type="hidden" name="id" value={product.id} />
                              <Button variant="destructive-soft" size="sm" type="submit">
                                Archive
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
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

function categoryName(
  context: Awaited<ReturnType<typeof requireBusiness>>,
  categoryId: string | null,
  categories: Array<{ id: string; name: string }>,
): string {
  if (!categoryId) return "Uncategorised";
  return categories.find((category) => category.id === categoryId)?.name ?? "Uncategorised";
}
