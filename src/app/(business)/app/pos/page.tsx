import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  productCategories,
  productStock,
  productVariants,
  products,
  variantStock,
} from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { PosTerminal, type PosCategory, type PosCustomer, type PosProduct } from "@/components/pos/pos-terminal";

/** This screen reads request-time data, so it is a blocking route. */

export default async function PosPage() {
  const context = await requireBusiness("pos.use");
  const tenantId = context.tenant.id;
  const branchId = context.activeBranch.id;

  const [categories, stockRows, customerRows, variantRows] = await Promise.all([
    db
      .select()
      .from(productCategories)
      .where(eq(productCategories.tenantId, tenantId))
      .orderBy(productCategories.name),
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        unit: products.unit,
        hasVariants: products.hasVariants,
        quantity: productStock.quantity,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        categoryId: products.categoryId,
      })
      .from(products)
      .innerJoin(
        productStock,
        and(
          eq(productStock.productId, products.id),
          eq(productStock.tenantId, tenantId),
          eq(productStock.branchId, branchId),
        ),
      )
      .where(and(eq(products.tenantId, tenantId), eq(products.status, "active")))
      .orderBy(products.name),
    db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.status, "active")))
      .orderBy(customers.name)
      .limit(200),
    db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        productName: products.name,
        name: productVariants.name,
        sku: productVariants.sku,
        barcode: productVariants.barcode,
        unit: products.unit,
        quantity: variantStock.quantity,
        costPrice: productVariants.costPrice,
        sellingPrice: productVariants.sellingPrice,
        categoryId: products.categoryId,
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
      .orderBy(products.name, productVariants.name),
  ]);

  const variantProductIds = new Set(variantRows.map((row) => row.productId));

  const terminalProducts: PosProduct[] = [
    ...stockRows
      // A product with variant stock is sold through its variant rows so the
      // till can never oversell the base record.
      .filter((row) => !variantProductIds.has(row.id))
      .map((row) => ({
        id: row.id,
        productId: row.id,
        variantId: null,
        name: row.name,
        sku: row.sku,
        barcode: row.barcode,
        unit: row.unit,
        quantity: row.quantity,
        costPrice: row.costPrice,
        sellingPrice: row.sellingPrice,
        categoryId: row.categoryId,
      })),
    ...variantRows.map((row) => ({
      id: row.id,
      productId: row.productId,
      variantId: row.id,
      name: `${row.productName} · ${row.name}`,
      sku: row.sku,
      barcode: row.barcode,
      unit: row.unit,
      quantity: Number(row.quantity ?? 0),
      costPrice: row.costPrice,
      sellingPrice: row.sellingPrice,
      categoryId: row.categoryId,
    })),
  ];

  const terminalCategories: PosCategory[] = categories.map((row) => ({ id: row.id, name: row.name }));
  const terminalCustomers: PosCustomer[] = customerRows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
  }));

  return (
    <div className="mx-auto max-w-[1480px] space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Point of sale
          </p>
          <h1 className="font-heading mt-1 text-[22px] font-semibold tracking-[-0.02em] text-foreground">
            The till is ready, {context.user.name.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Stock at {context.activeBranch.name} · net prices in {context.tenant.currency}.
          </p>
        </div>
        <Link
          href="/app/sales"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-[12.5px] font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-muted/50"
        >
          View sales
        </Link>
      </div>

      <PosTerminal
        branchName={context.activeBranch.name}
        tenantName={context.tenant.name}
        userName={context.user.name}
        products={terminalProducts}
        categories={terminalCategories}
        customers={terminalCustomers}
        tenant={{
          name: context.tenant.name,
          currency: context.tenant.currency,
          taxRate: context.tenant.taxRate,
          pricesIncludeTax: context.tenant.pricesIncludeTax,
        }}
      />
    </div>
  );
}
