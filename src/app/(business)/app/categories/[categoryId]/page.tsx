import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { CategoryForm } from "@/components/categories/category-form";
import { Button } from "@/components/ui/button";

type CategoryEditPageProps = {
  params: Promise<{ categoryId: string }>;
};

export default async function CategoryEditPage({ params }: CategoryEditPageProps) {
  const { categoryId } = await params;
  const context = await requireBusiness("categories.manage");

  const [category] = await db
    .select()
    .from(productCategories)
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.tenantId, context.tenant.id),
      ),
    )
    .limit(1);

  if (!category) {
    return (
      <div className="max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="font-heading text-[22px] font-semibold">Category not found</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">It may have been deleted or moved to another workspace.</p>
        <Button render={<Link href="/app/categories" />} nativeButton={false} className="mt-6">
          Back to categories
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Catalogue</p>
          <h1 className="font-heading text-[25px] leading-[1.15] font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">
            Edit category
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">{category.name}</p>
        </div>
        <Button render={<Link href="/app/categories" />} nativeButton={false}>
          Back to categories
        </Button>
      </div>

      <CategoryForm
        mode="update"
        category={{ id: category.id, name: category.name, description: category.description }}
      />
    </div>
  );
}
