"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { saleItems, sales } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { createSale, refundSale } from "@/lib/services/sales";
import { syncStockLevel } from "@/lib/services/notifications";
import { createSaleSchema } from "@/lib/validation/pos";

export type PosSaleOutcome = { ok: true; saleId: string } | { ok: false; error: string };

export async function completePosSale(input: {
  customerId?: string | null;
  lines: Array<{ productId: string; variantId: string | null; quantity: number }>;
  method: "cash" | "momo" | "bank" | "card" | "credit";
  amountPaidMinor: number;
  discountMinor?: number;
  notes?: string | null;
}): Promise<PosSaleOutcome> {
  const context = await requireBusiness("pos.use");
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "The sale could not be validated. Review the cart and try again." };
  }

  const result = await createSale({
    tenantId: context.tenant.id,
    branchId: context.activeBranch.id,
    cashierId: context.user.id,
    customerId: parsed.data.customerId ?? null,
    lines: parsed.data.lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId ?? null,
      quantity: line.quantity,
    })),
    method: parsed.data.method,
    amountPaidMinor: parsed.data.amountPaidMinor,
    discountMinor: parsed.data.discountMinor,
    notes: parsed.data.notes ?? null,
  });

  if (!result.ok) return result;

  const stockUpdates = new Map<string, { productId: string; variantId: string | null }>();
  for (const line of parsed.data.lines) {
    const key = `${line.productId}:${line.variantId ?? "base"}`;
    if (!stockUpdates.has(key)) {
      stockUpdates.set(key, { productId: line.productId, variantId: line.variantId ?? null });
    }
  }
  for (const update of stockUpdates.values()) {
    await syncStockLevel({
      tenantId: context.tenant.id,
      branchId: context.activeBranch.id,
      productId: update.productId,
      variantId: update.variantId,
      actorId: context.user.id,
    });
  }

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "sale.created",
    entityType: "sale",
    entityId: result.saleId,
    summary: `Sale ${result.saleId.slice(0, 8)} created at the till`,
  });

  redirect(`/app/sales/${result.saleId}?receipt=1`);
}

export async function refundSaleAction(saleId: string): Promise<{ ok: boolean; error?: string }> {
  const context = await requireBusiness("sales.refund");
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.tenantId, context.tenant.id)))
    .limit(1);
  if (!sale) return { ok: false, error: "The sale was not found." };

  const result = await refundSale({
    tenantId: context.tenant.id,
    branchId: context.activeBranch.id,
    saleId: sale.id,
    refundedBy: context.user.id,
  });

  if (!result.ok) return { ok: false, error: result.error };

  const refundedItems = await db
    .select({ productId: saleItems.productId, variantId: saleItems.variantId })
    .from(saleItems)
    .where(and(eq(saleItems.saleId, sale.id), eq(saleItems.tenantId, context.tenant.id)));
  const seen = new Set<string>();
  for (const item of refundedItems) {
    const key = `${item.productId}:${item.variantId ?? "base"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await syncStockLevel({
      tenantId: context.tenant.id,
      branchId: context.activeBranch.id,
      productId: item.productId,
      variantId: item.variantId,
      actorId: context.user.id,
    });
  }

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "sale.refunded",
    entityType: "sale",
    entityId: sale.id,
    summary: `Sale ${sale.receiptNumber} refunded`,
  });

  redirect(`/app/sales/${sale.id}`);
}
