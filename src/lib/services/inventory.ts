import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import type { Transaction } from "@/lib/db";
import {
  branches,
  productStock,
  products,
  stockAdjustments,
  stockMovements,
  stockTransfers,
  variantStock,
} from "@/lib/db/schema";
import { nextDocumentNumber } from "./documents";

export type AdjustmentType = "increase" | "decrease" | "set";

export type StockAdjustmentInput = {
  tenantId: string;
  branchId: string;
  productId: string;
  variantId: string | null;
  type: AdjustmentType;
  /** New quantity for `set`, otherwise the size of the change. */
  quantity: number;
  reason: string;
  notes?: string | null;
  userId: string;
};

export type StockTransferInput = {
  tenantId: string;
  fromBranchId: string;
  toBranchId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  notes?: string | null;
  userId: string;
};

export type InventoryOutcome = { ok: true; reference: string } | { ok: false; error: string };

type Tx = Transaction;

async function readStock(
  tx: Tx,
  tenantId: string,
  branchId: string,
  productId: string,
  variantId: string | null,
) {
  if (variantId) {
    const [row] = await tx
      .select({ quantity: variantStock.quantity })
      .from(variantStock)
      .where(
        and(
          eq(variantStock.tenantId, tenantId),
          eq(variantStock.branchId, branchId),
          eq(variantStock.variantId, variantId),
        ),
      )
      .limit(1);
    return row?.quantity ?? null;
  }
  const [row] = await tx
    .select({ quantity: productStock.quantity })
    .from(productStock)
    .where(
      and(
        eq(productStock.tenantId, tenantId),
        eq(productStock.branchId, branchId),
        eq(productStock.productId, productId),
      ),
    )
    .limit(1);
  return row?.quantity ?? null;
}

async function writeStock(
  tx: Tx,
  tenantId: string,
  branchId: string,
  productId: string,
  variantId: string | null,
  quantity: number,
) {
  if (variantId) {
    await tx
      .update(variantStock)
      .set({ quantity })
      .where(
        and(
          eq(variantStock.tenantId, tenantId),
          eq(variantStock.branchId, branchId),
          eq(variantStock.variantId, variantId),
        ),
      );
    return;
  }
  await tx
    .update(productStock)
    .set({ quantity })
    .where(
      and(
        eq(productStock.tenantId, tenantId),
        eq(productStock.branchId, branchId),
        eq(productStock.productId, productId),
      ),
    );
}

/** Create or top up the stock row for a branch/product pair. */
async function ensureStockRow(
  tx: Tx,
  tenantId: string,
  branchId: string,
  productId: string,
  variantId: string | null,
  quantity: number,
  reorderLevel: number,
) {
  if (variantId) {
    await tx
      .insert(variantStock)
      .values({ id: crypto.randomUUID(), tenantId, variantId, productId, branchId, quantity, reorderLevel })
      .onDuplicateKeyUpdate({ set: { quantity } });
    return;
  }
  await tx
    .insert(productStock)
    .values({ id: crypto.randomUUID(), tenantId, productId, branchId, quantity, reorderLevel })
    .onDuplicateKeyUpdate({ set: { quantity } });
}

export async function adjustStock(input: StockAdjustmentInput): Promise<InventoryOutcome> {
  const [product] = await db
    .select({ id: products.id, name: products.name, reorderLevel: products.reorderLevel })
    .from(products)
    .where(and(eq(products.id, input.productId), eq(products.tenantId, input.tenantId)))
    .limit(1);
  if (!product) return { ok: false, error: "That product is not in this workspace." };

  const result = await db.transaction(async (tx): Promise<InventoryOutcome> => {
    const before = await readStock(tx, input.tenantId, input.branchId, input.productId, input.variantId);
    const quantityBefore = before ?? 0;

    let quantityAfter: number;
    if (input.type === "set") {
      quantityAfter = input.quantity;
    } else if (input.type === "increase") {
      quantityAfter = quantityBefore + input.quantity;
    } else {
      quantityAfter = quantityBefore - input.quantity;
    }

    if (quantityAfter < 0) {
      return { ok: false, error: `Only ${quantityBefore} ${product.name} is on hand — you cannot remove more than that.` };
    }

    if (before === null) {
      await ensureStockRow(
        tx,
        input.tenantId,
        input.branchId,
        input.productId,
        input.variantId,
        quantityAfter,
        product.reorderLevel,
      );
    } else {
      await writeStock(
        tx,
        input.tenantId,
        input.branchId,
        input.productId,
        input.variantId,
        quantityAfter,
      );
    }

    const reference = await nextDocumentNumber(tx, input.tenantId, "adjustment", "ADJ", 5);
    await tx.insert(stockAdjustments).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      branchId: input.branchId,
      productId: input.productId,
      variantId: input.variantId,
      reference,
      type: input.type,
      quantityBefore,
      quantityAfter,
      reason: input.reason,
      notes: input.notes ?? null,
      createdBy: input.userId,
    });

    await tx.insert(stockMovements).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      branchId: input.branchId,
      productId: input.productId,
      variantId: input.variantId,
      type: "adjustment",
      quantityDelta: quantityAfter - quantityBefore,
      balanceAfter: quantityAfter,
      referenceType: "stock_adjustment",
      referenceId: reference,
      referenceLabel: reference,
      note: input.reason,
      createdBy: input.userId,
    });

    return { ok: true, reference };
  });

  return result;
}

export async function transferStock(input: StockTransferInput): Promise<InventoryOutcome> {
  if (input.fromBranchId === input.toBranchId) {
    return { ok: false, error: "Choose two different branches for a transfer." };
  }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: "Enter a whole quantity greater than zero." };
  }

  const [product] = await db
    .select({ id: products.id, name: products.name, reorderLevel: products.reorderLevel })
    .from(products)
    .where(and(eq(products.id, input.productId), eq(products.tenantId, input.tenantId)))
    .limit(1);
  if (!product) return { ok: false, error: "That product is not in this workspace." };

  const branchRows = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.tenantId, input.tenantId), eq(branches.status, "active")));
  const allowed = new Set(branchRows.map((branch) => branch.id));
  if (!allowed.has(input.fromBranchId) || !allowed.has(input.toBranchId)) {
    return { ok: false, error: "Both branches must belong to this workspace." };
  }

  const result = await db.transaction(async (tx): Promise<InventoryOutcome> => {
    const fromQuantity = await readStock(
      tx,
      input.tenantId,
      input.fromBranchId,
      input.productId,
      input.variantId,
    );
    if (fromQuantity === null) {
      return { ok: false, error: "There is no stock record for that product at the sending branch." };
    }
    if (fromQuantity < input.quantity) {
      return {
        ok: false,
        error: `Only ${fromQuantity} ${product.name} is available to transfer from that branch.`,
      };
    }

    const toStock = await readStock(tx, input.tenantId, input.toBranchId, input.productId, input.variantId);
    const toQuantity = toStock ?? 0;

    const nextFrom = fromQuantity - input.quantity;
    const nextTo = toQuantity + input.quantity;

    await writeStock(tx, input.tenantId, input.fromBranchId, input.productId, input.variantId, nextFrom);
    if (toStock === null) {
      // The destination branch has never held this product or variant.
      await ensureStockRow(
        tx,
        input.tenantId,
        input.toBranchId,
        input.productId,
        input.variantId,
        nextTo,
        product.reorderLevel,
      );
    } else {
      await writeStock(tx, input.tenantId, input.toBranchId, input.productId, input.variantId, nextTo);
    }

    const reference = await nextDocumentNumber(tx, input.tenantId, "transfer", "TRF", 5);
    await tx.insert(stockTransfers).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      fromBranchId: input.fromBranchId,
      toBranchId: input.toBranchId,
      productId: input.productId,
      variantId: input.variantId,
      reference,
      quantity: input.quantity,
      notes: input.notes ?? null,
      createdBy: input.userId,
    });

    await tx.insert(stockMovements).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      branchId: input.fromBranchId,
      productId: input.productId,
      variantId: input.variantId,
      type: "transfer_out",
      quantityDelta: -input.quantity,
      balanceAfter: nextFrom,
      referenceType: "stock_transfer",
      referenceId: reference,
      referenceLabel: reference,
      note: input.notes ?? null,
      createdBy: input.userId,
    });

    await tx.insert(stockMovements).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      branchId: input.toBranchId,
      productId: input.productId,
      variantId: input.variantId,
      type: "transfer_in",
      quantityDelta: input.quantity,
      balanceAfter: nextTo,
      referenceType: "stock_transfer",
      referenceId: reference,
      referenceLabel: reference,
      note: input.notes ?? null,
      createdBy: input.userId,
    });

    return { ok: true, reference };
  });

  return result;
}
