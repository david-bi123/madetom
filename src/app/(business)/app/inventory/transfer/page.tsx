import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productStock, productVariants, products, variantStock } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { FormPageHeader } from "@/components/forms/form-page-header";
import {
  StockTransferForm,
  type StockBranchOption,
  type StockProductOption,
  type StockVariantOption,
} from "@/components/inventory/stock-action-forms";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function TransferStockPage() {
  const context = await requireBusiness("inventory.transfer");
  const tenantId = context.tenant.id;
  const branchId = context.activeBranch.id;

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      unit: products.unit,
      quantity: productStock.quantity,
    })
    .from(products)
    .leftJoin(
      productStock,
      and(
        eq(productStock.productId, products.id),
        eq(productStock.tenantId, tenantId),
        eq(productStock.branchId, branchId),
      ),
    )
    .where(
      and(
        eq(products.tenantId, tenantId),
        eq(products.status, "active"),
        eq(products.trackInventory, true),
      ),
    )
    .orderBy(asc(products.name));

  const destinationBranches: StockBranchOption[] = context.branches
    .filter((branch) => branch.id !== branchId)
    .map((branch) => ({ id: branch.id, name: branch.name }));

  const productOptions: StockProductOption[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    quantity: Number(row.quantity ?? 0),
    unit: row.unit,
  }));

  const variantRows = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      productName: products.name,
      name: productVariants.name,
      sku: productVariants.sku,
      quantity: variantStock.quantity,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(
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
        eq(products.status, "active"),
      ),
    )
    .orderBy(products.name, productVariants.name);

  const variantOptions: StockVariantOption[] = variantRows.map((variant) => ({
    id: variant.id,
    productId: variant.productId,
    productName: variant.productName,
    name: variant.name,
    sku: variant.sku,
    quantity: Number(variant.quantity ?? 0),
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <FormPageHeader
        eyebrow={context.activeBranch.name}
        title="Transfer stock"
        description="Move units from this branch to another branch in your workspace."
        backHref="/app/inventory"
        backLabel="All inventory"
      />

      {destinationBranches.length === 0 ? (
        <p className="mb-4 rounded-xl border border-border bg-warning-soft px-4 py-3 text-[13px] leading-relaxed text-[#7c4b08]">
          This workspace only has one branch, so there is nowhere to transfer stock to yet.
        </p>
      ) : null}

      <StockTransferForm products={productOptions} branches={destinationBranches} variants={variantOptions} />
    </div>
  );
}
