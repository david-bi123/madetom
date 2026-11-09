import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { productCategories, products as productsTable } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { SuccessBanner } from "@/components/ui/success-banner";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { Tags } from "lucide-react";
import { deleteCategory } from "./actions";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

type CategoriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const context = await requireBusiness("products.view");
  const params = await searchParams;
  const created = params.created === "1";
  const canManage = context.permissions.has("categories.manage");
  const tenantId = context.tenant.id;

  const [categories, counts] = await Promise.all([
    db
      .select()
      .from(productCategories)
      .where(eq(productCategories.tenantId, tenantId))
      .orderBy(productCategories.name),
    db
      .select({
        categoryId: productsTable.categoryId,
        count: sql<number>`count(*)`,
      })
      .from(productsTable)
      .where(and(eq(productsTable.tenantId, tenantId), eq(productsTable.status, "active")))
      .groupBy(productsTable.categoryId),
  ]);

  const countByCategory = new Map<string, number>();
  for (const row of counts) {
    if (row.categoryId) countByCategory.set(row.categoryId, Number(row.count));
  }

  return (
    <div>
      <PageHeader
        eyebrow={context.activeBranch.name}
        title="Categories"
        description="Group products so the till, catalogue, and reports stay easy to read."
        actions={
          canManage ? (
            <Button render={<Link href="/app/categories/new" />} nativeButton={false}>
              <Tags className="size-4" aria-hidden />
              New category
            </Button>
          ) : undefined
        }
      />

      {created ? <SuccessBanner message="Category created. It is ready to use on products." /> : null}

      {categories.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Create a category to group drinks, groceries, hardware, or anything else you sell."
            action={
              canManage ? (
                <Button render={<Link href="/app/categories/new" />} size="sm" nativeButton={false}>
                  Add category
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
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Category</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Description</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Products</th>
                  {canManage ? (
                    <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {categories.map((category) => (
                  <tr key={category.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/app/categories/${category.id}`} className="font-medium text-foreground hover:underline">
                        {category.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                      {category.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                      {countByCategory.get(category.id) ?? 0}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" render={<Link href={`/app/categories/${category.id}`} />} nativeButton={false}>
                            Edit
                          </Button>
                          <ConfirmActionButton
                            action={deleteCategory}
                            fields={{ id: category.id }}
                            triggerLabel="Delete"
                            title="Delete this category?"
                            description={`Products in ${category.name} will become uncategorised. Their sales history is not affected.`}
                            confirmLabel="Delete category"
                            variant="destructive-soft"
                          />
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
