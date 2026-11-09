import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productCategories, suppliers } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function NewProductPage() {
  const context = await requireBusiness("products.manage");
  const tenantId = context.tenant.id;

  const [categoryOptions, supplierOptions] = await Promise.all([
    db.select().from(productCategories).where(eq(productCategories.tenantId, tenantId)).orderBy(productCategories.name),
    db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId)).orderBy(suppliers.name),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Catalogue</p>
          <h1 className="font-heading text-[25px] leading-[1.15] font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">
            New product
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">Cost, price, and how stock is tracked.</p>
        </div>
        <Button render={<Link href="/app/products" />} nativeButton={false}>
          Back to products
        </Button>
      </div>

      <ProductForm
        mode="create"
        categories={categoryOptions.map((category) => ({ id: category.id, name: category.name }))}
        suppliers={supplierOptions.map((supplier) => ({ id: supplier.id, name: supplier.name }))}
      />
    </div>
  );
}
