import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, suppliers } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { FormPageHeader } from "@/components/forms/form-page-header";
import {
  PurchaseForm,
  type PurchaseProductOption,
  type PurchaseSupplierOption,
} from "@/components/purchases/purchase-form";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function NewPurchasePage() {
  const context = await requireBusiness("purchases.manage");

  const [supplierRows, productRows] = await Promise.all([
    db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, context.tenant.id), eq(suppliers.status, "active")))
      .orderBy(asc(suppliers.name)),
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        costPrice: products.costPrice,
        unit: products.unit,
      })
      .from(products)
      .where(and(eq(products.tenantId, context.tenant.id), eq(products.status, "active")))
      .orderBy(asc(products.name)),
  ]);

  const productOptions: PurchaseProductOption[] = productRows.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    costPrice: String(product.costPrice),
    unit: product.unit,
  }));

  const supplierOptions: PurchaseSupplierOption[] = supplierRows.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <FormPageHeader
        eyebrow={context.activeBranch.name}
        title="Record a purchase"
        description="What you bought, from whom, and what you paid. Stock is added to this branch as soon as you save."
        backHref="/app/purchases"
        backLabel="All purchases"
      />

      {supplierOptions.length === 0 ? (
        <p className="mb-4 rounded-xl border border-border bg-warning-soft px-4 py-3 text-[13px] leading-relaxed text-[#7c4b08]">
          Add a supplier first — every purchase has to be linked to one.{" "}
          <Link href="/app/suppliers/new" className="font-semibold underline">
            Add a supplier
          </Link>
          .
        </p>
      ) : null}

      {productOptions.length === 0 ? (
        <p className="mb-4 rounded-xl border border-border bg-warning-soft px-4 py-3 text-[13px] leading-relaxed text-[#7c4b08]">
          Add a product first — a purchase is made up of products you sell.{" "}
          <Link href="/app/products/new" className="font-semibold underline">
            Add a product
          </Link>
          .
        </p>
      ) : null}

      <PurchaseForm products={productOptions} suppliers={supplierOptions} />
    </div>
  );
}
