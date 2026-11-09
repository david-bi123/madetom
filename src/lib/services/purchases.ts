import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import type { Transaction } from "@/lib/db";
import {
  payments,
  productStock,
  products,
  purchaseItems,
  purchases,
  stockMovements,
} from "@/lib/db/schema";
import { fromMinor } from "@/lib/format";
import { nextDocumentNumber } from "./documents";

export type PurchaseLineInput = {
  productId: string;
  quantity: number;
  unitCostMinor: number;
};

export type RecordPurchaseInput = {
  tenantId: string;
  branchId: string;
  supplierId: string;
  lines: PurchaseLineInput[];
  amountPaidMinor: number;
  method: "cash" | "momo" | "bank" | "card" | "credit";
  reference?: string | null;
  notes?: string | null;
  userId: string;
};

export type PurchaseOutcome = { ok: true; purchaseId: string; reference: string } | { ok: false; error: string };

type Tx = Transaction;

async function ensureStockRow(
  tx: Tx,
  tenantId: string,
  branchId: string,
  productId: string,
  quantity: number,
  reorderLevel: number,
) {
  await tx
    .insert(productStock)
    .values({ id: crypto.randomUUID(), tenantId, productId, branchId, quantity, reorderLevel })
    .onDuplicateKeyUpdate({ set: { quantity } });
}

/**
 * Record a purchase and receive the stock in one transaction. Stock is added to
 * the branch ledger only when the purchase is marked as received.
 */
export async function recordPurchase(input: RecordPurchaseInput): Promise<PurchaseOutcome> {
  if (input.lines.length === 0) return { ok: false, error: "Add at least one product to the purchase." };

  const productIds = [...new Set(input.lines.map((line) => line.productId))];
  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      unit: products.unit,
      costPrice: products.costPrice,
      reorderLevel: products.reorderLevel,
    })
    .from(products)
    .where(and(eq(products.tenantId, input.tenantId), eq(products.status, "active")));
  const productById = new Map(productRows.map((row) => [row.id, row]));

  for (const id of productIds) {
    if (!productById.has(id)) {
      return { ok: false, error: "One of the selected products is not available in this workspace." };
    }
  }

  const subtotalMinor = input.lines.reduce(
    (sum, line) => sum + line.unitCostMinor * line.quantity,
    0,
  );
  const taxMinor = 0;
  const totalMinor = subtotalMinor + taxMinor;
  const paidMinor = Math.min(Math.max(0, input.amountPaidMinor), totalMinor);

  const result = await db.transaction(async (tx): Promise<PurchaseOutcome> => {
    const reference = await nextDocumentNumber(tx, input.tenantId, "purchase", "PO", 5);
    const purchaseId = crypto.randomUUID();

    await tx.insert(purchases).values({
      id: purchaseId,
      tenantId: input.tenantId,
      branchId: input.branchId,
      supplierId: input.supplierId,
      reference,
      status: "received",
      subtotal: fromMinor(subtotalMinor),
      taxAmount: fromMinor(taxMinor),
      total: fromMinor(totalMinor),
      amountPaid: fromMinor(paidMinor),
      notes: input.notes ?? null,
      receivedAt: new Date(),
      receivedBy: input.userId,
      createdBy: input.userId,
    });

    for (const line of input.lines) {
      const product = productById.get(line.productId)!;
      await tx.insert(purchaseItems).values({
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        purchaseId,
        productId: line.productId,
        variantId: null,
        nameSnapshot: product.name,
        quantity: line.quantity,
        unitCost: fromMinor(line.unitCostMinor),
        lineTotal: fromMinor(line.unitCostMinor * line.quantity),
      });

      const [existing] = await tx
        .select({ quantity: productStock.quantity })
        .from(productStock)
        .where(
          and(
            eq(productStock.tenantId, input.tenantId),
            eq(productStock.branchId, input.branchId),
            eq(productStock.productId, line.productId),
          ),
        )
        .limit(1);

      const nextQuantity = (existing?.quantity ?? 0) + line.quantity;
      if (existing) {
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
      } else {
        await ensureStockRow(
          tx,
          input.tenantId,
          input.branchId,
          line.productId,
          nextQuantity,
          product.reorderLevel,
        );
      }

      await tx.insert(stockMovements).values({
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        branchId: input.branchId,
        productId: line.productId,
        variantId: null,
        type: "purchase",
        quantityDelta: line.quantity,
        balanceAfter: nextQuantity,
        referenceType: "purchase",
        referenceId: purchaseId,
        referenceLabel: reference,
        createdBy: input.userId,
      });
    }

    if (paidMinor > 0) {
      await tx.insert(payments).values({
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        saleId: null,
        purchaseId,
        method: input.method,
        amount: fromMinor(paidMinor),
        reference: input.reference ?? null,
        note: input.notes ?? null,
        createdBy: input.userId,
      });
    }

    return { ok: true, purchaseId, reference };
  });

  return result;
}
