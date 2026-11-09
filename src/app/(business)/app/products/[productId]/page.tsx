import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productCategories, productVariants, products, suppliers, variantStock } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { ProductForm } from "@/components/products/product-form";
import { VariantsManager } from "@/components/products/variants-manager";
import { Button } from "@/components/ui/button";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

type ProductEditPageProps = {
  params: Promise<{ productId: string }>;
};

export default async function ProductEditPage({ params }: ProductEditPageProps) {
  const { productId } = await params;
  const context = await requireBusiness("products.manage");
  const tenantId = context.tenant.id;

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product || product.tenantId !== tenantId) {
    return (
      <div className="max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="font-heading text-[22px] font-semibold">Product not found</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">It may have been archived or moved to another workspace.</p>
        <Button render={<Link href="/app/products" />} nativeButton={false} className="mt-6">
          Back to products
        </Button>
      </div>
    );
  }

  const [categoryOptions, supplierOptions] = await Promise.all([
    db.select().from(productCategories).where(eq(productCategories.tenantId, tenantId)).orderBy(productCategories.name),
    db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId)).orderBy(suppliers.name),
  ]);

  const variantRows = await db
    .select({
      id: productVariants.id,
      name: productVariants.name,
      sku: productVariants.sku,
      barcode: productVariants.barcode,
      costPrice: productVariants.costPrice,
      sellingPrice: productVariants.sellingPrice,
      reorderLevel: productVariants.reorderLevel,
      status: productVariants.status,
      quantity: variantStock.quantity,
    })
    .from(productVariants)
    .leftJoin(
      variantStock,
      and(
        eq(variantStock.variantId, productVariants.id),
        eq(variantStock.tenantId, tenantId),
        eq(variantStock.branchId, context.activeBranch.id),
      ),
    )
    .where(and(eq(productVariants.tenantId, tenantId), eq(productVariants.productId, product.id)))
    .orderBy(productVariants.name);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Catalogue</p>
          <h1 className="font-heading text-[25px] leading-[1.15] font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">
            Edit product
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">{product.name}</p>
        </div>
        <Button render={<Link href="/app/products" />} nativeButton={false}>
          Back to products
        </Button>
      </div>

      <ProductForm
        mode="update"
        product={product}
        categories={categoryOptions.map((category) => ({ id: category.id, name: category.name }))}
        suppliers={supplierOptions.map((supplier) => ({ id: supplier.id, name: supplier.name }))}
      />

      <VariantsManager
        productId={product.id}
        variants={variantRows.map((variant) => ({
          ...variant,
          quantity: Number(variant.quantity ?? 0),
        }))}
      />
    </div>
  );
}
