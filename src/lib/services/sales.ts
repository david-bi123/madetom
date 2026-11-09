import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import type { Database, Transaction } from "@/lib/db";
import {
  payments,
  productStock,
  productVariants,
  products,
  saleItems,
  sales,
  stockMovements,
  tenants,
  variantStock,
} from "@/lib/db/schema";
import { toMinor, fromMinor } from "@/lib/format";
import { nextDocumentNumber } from "./documents";

export type CreateSaleInput = {
  tenantId: string;
  branchId: string;
  cashierId: string;
  customerId?: string | null;
  lines: Array<{ productId: string; variantId: string | null; quantity: number }>;
  method: "cash" | "momo" | "bank" | "card" | "credit";
  amountPaidMinor: number;
  discountMinor?: number;
  notes?: string | null;
};

export type SaleOutcome = { ok: true; saleId: string } | { ok: false; error: string };
export type RefundOutcome = { ok: true; saleId: string } | { ok: false; error: string };

type PreparedLine = {
  productId: string;
  variantId: string | null;
  name: string;
  sku: string;
  quantity: number;
  unitCostMinor: number;
  netMinor: number;
  taxMinor: number;
};

type SaleResult = { ok: true; saleId: string } | { ok: false; error: string };
type RefundResult = { ok: true; saleId: string } | { ok: false; error: string };

/** Either the pooled client or an open transaction can run these reads. */
type StockReader = Database | Transaction;

export async function createSale(input: CreateSaleInput): Promise<SaleOutcome> {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, input.tenantId))
    .limit(1);
  if (!tenant) return { ok: false, error: "This workspace is not available." };

  const taxFraction = Number(tenant.taxRate) / 100;
  const prepared: PreparedLine[] = [];

  const stockFor = async (tx: StockReader, productId: string, variantId: string | null) => {
    const row =
      variantId !== null
        ? await tx
            .select({
              quantity: variantStock.quantity,
              productId: products.id,
              productName: products.name,
              variantName: productVariants.name,
              sku: productVariants.sku,
              unit: products.unit,
              costPrice: productVariants.costPrice,
              sellingPrice: productVariants.sellingPrice,
            })
            .from(variantStock)
            .innerJoin(products, eq(products.id, variantStock.productId))
            .innerJoin(productVariants, eq(productVariants.id, variantStock.variantId))
            .where(
              and(
                eq(variantStock.tenantId, input.tenantId),
                eq(variantStock.branchId, input.branchId),
                eq(variantStock.variantId, variantId),
              ),
            )
            .limit(1)
        : await tx
            .select({
              quantity: productStock.quantity,
              productId: products.id,
              productName: products.name,
              sku: products.sku,
              unit: products.unit,
              costPrice: products.costPrice,
              sellingPrice: products.sellingPrice,
            })
            .from(productStock)
            .innerJoin(products, eq(products.id, productStock.productId))
            .where(
              and(
                eq(productStock.tenantId, input.tenantId),
                eq(productStock.branchId, input.branchId),
                eq(productStock.productId, productId),
              ),
            )
            .limit(1);
    return row[0] ?? null;
  };

  for (const line of input.lines) {
    const stock = await stockFor(db, line.productId, line.variantId);
    if (!stock) return { ok: false, error: "One or more products have no stock record for this branch." };
    if (stock.quantity < line.quantity) return { ok: false, error: `Not enough stock for ${stock.productName}.` };

    const unitCostMinor = toMinor(stock.costPrice);
    const unitPriceMinor = toMinor(stock.sellingPrice);
    const netMinor = tenant.pricesIncludeTax ? Math.round(unitPriceMinor / (1 + taxFraction)) : unitPriceMinor;
    const taxMinor = tenant.pricesIncludeTax ? Math.max(0, Math.round(unitPriceMinor - netMinor)) : 0;
    const name =
      "variantName" in stock ? `${stock.productName} · ${stock.variantName}` : stock.productName;
    prepared.push({
      productId: stock.productId,
      variantId: line.variantId,
      name,
      sku: stock.sku,
      quantity: line.quantity,
      unitCostMinor,
      netMinor,
      taxMinor,
    });
  }

  const subtotalMinor = prepared.reduce((sum, line) => sum + line.netMinor * line.quantity, 0);
  const requestedDiscountMinor = Math.min(
    Math.max(0, Math.round(input.discountMinor ?? 0)),
    subtotalMinor,
  );

  // A sale-level discount is shared across lines in proportion to each line's
  // net value, so every receipt line carries its fair share of the reduction.
  let allocatedDiscount = 0;
  const linePricing = prepared.map((line, index) => {
    const netLineMinor = line.netMinor * line.quantity;
    const discountMinor =
      index === prepared.length - 1
        ? requestedDiscountMinor - allocatedDiscount
        : subtotalMinor > 0
          ? Math.round((requestedDiscountMinor * netLineMinor) / subtotalMinor)
          : 0;
    allocatedDiscount += discountMinor;
    const discountedNetMinor = netLineMinor - discountMinor;
    const taxMinor = tenant.pricesIncludeTax ? Math.round(discountedNetMinor * taxFraction) : 0;
    return { discountMinor, discountedNetMinor, taxMinor };
  });

  const discountMinor = linePricing.reduce((sum, line) => sum + line.discountMinor, 0);
  const taxAmountMinor = linePricing.reduce((sum, line) => sum + line.taxMinor, 0);
  const totalMinor = subtotalMinor - discountMinor + taxAmountMinor;
  const tenderedMinor = Math.max(0, input.amountPaidMinor);
  const paidMinor = Math.min(tenderedMinor, totalMinor);
  const changeDueMinor =
    input.method === "cash" && tenderedMinor > totalMinor ? tenderedMinor - totalMinor : 0;

  const result = await db.transaction(async (tx): Promise<SaleResult> => {
    const receiptNumberValue = await nextDocumentNumber(tx, input.tenantId, "sale", "MADT", 5);
    const createdSaleId = crypto.randomUUID();
    await tx.insert(sales).values({
      id: createdSaleId,
      tenantId: input.tenantId,
      branchId: input.branchId,
      receiptNumber: receiptNumberValue,
      customerId: input.customerId ?? null,
      cashierId: input.cashierId,
      status: "completed",
      subtotal: fromMinor(subtotalMinor),
      discountAmount: fromMinor(discountMinor),
      taxAmount: fromMinor(taxAmountMinor),
      total: fromMinor(totalMinor),
      amountPaid: fromMinor(paidMinor),
      changeDue: fromMinor(changeDueMinor),
      paymentStatus: paidMinor === totalMinor ? "paid" : "partial",
    });

    for (const [index, line] of prepared.entries()) {
      const stock = await stockFor(tx, line.productId, line.variantId);
      if (!stock) return { ok: false, error: "Stock record disappeared during the sale." };
      const nextQuantity = stock.quantity - line.quantity;
      if (line.variantId) {
        await tx
          .update(variantStock)
          .set({ quantity: nextQuantity })
          .where(
            and(
              eq(variantStock.tenantId, input.tenantId),
              eq(variantStock.branchId, input.branchId),
              eq(variantStock.variantId, line.variantId),
            ),
          );
      } else {
        await tx
          .update(productStock)
          .set({ quantity: nextQuantity })
          .where(
            and(
              eq(productStock.tenantId, input.tenantId),
              eq(productStock.branchId, input.branchId),
              eq(productStock.productId, line.productId),
            ),
          );
      }
      await tx.insert(stockMovements).values({
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        branchId: input.branchId,
        productId: line.productId,
        variantId: line.variantId,
        type: "sale",
        quantityDelta: -line.quantity,
        balanceAfter: nextQuantity,
        referenceType: "sale",
        referenceId: createdSaleId,
        referenceLabel: receiptNumberValue,
        createdBy: input.cashierId,
      });
      await tx.insert(saleItems).values({
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        saleId: createdSaleId,
        productId: line.productId,
        variantId: line.variantId,
        nameSnapshot: line.name,
        skuSnapshot: line.sku,
        unitPrice: fromMinor(line.netMinor),
        unitCost: fromMinor(line.unitCostMinor),
        quantity: line.quantity,
        discountAmount: fromMinor(linePricing[index].discountMinor),
        taxAmount: fromMinor(linePricing[index].taxMinor),
        lineTotal: fromMinor(linePricing[index].discountedNetMinor),
      });
    }

    await tx.insert(payments).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      saleId: createdSaleId,
      purchaseId: null,
      method: input.method,
      amount: fromMinor(paidMinor),
      reference: null,
      note: input.notes ?? null,
      createdBy: input.cashierId,
    });

    return { ok: true, saleId: createdSaleId };
  });

  return result;
}

export async function refundSale(input: {
  tenantId: string;
  branchId: string;
  saleId: string;
  refundedBy: string;
}): Promise<RefundOutcome> {
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, input.saleId), eq(sales.tenantId, input.tenantId), eq(sales.branchId, input.branchId)))
    .limit(1);
  if (!sale || sale.status !== "completed") return { ok: false, error: "The sale cannot be refunded." };
  if (sale.refundedAt) return { ok: false, error: "The sale was already refunded." };

  const items = await db
    .select()
    .from(saleItems)
    .where(and(eq(saleItems.saleId, sale.id), eq(saleItems.tenantId, sale.tenantId)));
  // The refund returns exactly what the customer paid, including tax and net
  // of any sale-level discount.
  const refundAmountMinor = toMinor(sale.total);

  const refundResult = await db.transaction(async (tx): Promise<RefundResult> => {
    await tx
      .update(sales)
      .set({
        status: "refunded",
        refundedAt: new Date(),
        refundedBy: input.refundedBy,
        refundAmount: fromMinor(refundAmountMinor),
      })
      .where(eq(sales.id, sale.id));

    for (const item of items) {
      const stock = item.variantId
        ? await tx
            .select({ quantity: variantStock.quantity })
            .from(variantStock)
            .where(
              and(
                eq(variantStock.tenantId, item.tenantId),
                eq(variantStock.branchId, sale.branchId),
                eq(variantStock.variantId, item.variantId),
              ),
            )
            .limit(1)
        : await tx
            .select({ quantity: productStock.quantity })
            .from(productStock)
            .where(
              and(
                eq(productStock.tenantId, item.tenantId),
                eq(productStock.branchId, sale.branchId),
                eq(productStock.productId, item.productId),
              ),
            )
            .limit(1);

      const currentStock = stock[0];
      if (!currentStock) continue;
      const nextQuantity = currentStock.quantity + (item.quantity ?? 0);
      if (item.variantId) {
        await tx
          .update(variantStock)
          .set({ quantity: nextQuantity })
          .where(
            and(
              eq(variantStock.tenantId, item.tenantId),
              eq(variantStock.branchId, sale.branchId),
              eq(variantStock.variantId, item.variantId),
            ),
          );
      } else {
        await tx
          .update(productStock)
          .set({ quantity: nextQuantity })
          .where(
            and(
              eq(productStock.tenantId, item.tenantId),
              eq(productStock.branchId, sale.branchId),
              eq(productStock.productId, item.productId),
            ),
          );
      }
      await tx.insert(stockMovements).values({
        id: crypto.randomUUID(),
        tenantId: item.tenantId,
        branchId: sale.branchId,
        productId: item.productId,
        variantId: item.variantId,
        type: "refund",
        quantityDelta: item.quantity ?? 0,
        balanceAfter: nextQuantity,
        referenceType: "sale",
        referenceId: sale.id,
        referenceLabel: sale.receiptNumber,
        createdBy: input.refundedBy,
      });
    }

    return { ok: true, saleId: sale.id };
  });

  if (!refundResult.ok) return { ok: false, error: "Could not refund the sale." };
  return { ok: true, saleId: refundResult.saleId };
}
