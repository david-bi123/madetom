import Link from "next/link";
import { requireBusiness } from "@/lib/auth/guards";
import { CategoryForm } from "@/components/categories/category-form";
import { Button } from "@/components/ui/button";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function NewCategoryPage() {
  await requireBusiness("categories.manage");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Catalogue</p>
          <h1 className="font-heading text-[25px] leading-[1.15] font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">
            New category
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">A short name and optional description.</p>
        </div>
        <Button render={<Link href="/app/categories" />} nativeButton={false}>
          Back to categories
        </Button>
      </div>

      <CategoryForm mode="create" />
    </div>
  );
}
