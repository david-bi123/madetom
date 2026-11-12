"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productVariants } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { adjustStock, transferStock } from "@/lib/services/inventory";
import { notifyStockAdjustment, syncStockLevels } from "@/lib/services/notifications";
import { formString, zodState, type ActionState } from "@/lib/action-state";
import { stockAdjustmentSchema, stockTransferSchema } from "@/lib/validation/inventory";
import { hasFeature } from "@/lib/subscription/entitlements";

export async function adjustStockAction(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("inventory.adjust");

  const parsed = stockAdjustmentSchema.safeParse({
    productId: formString(formData, "productId"),
    variantId: formString(formData, "variantId") || null,
    type: formString(formData, "type"),
    quantity: formString(formData, "quantity"),
    reason: formString(formData, "reason"),
    notes: formString(formData, "notes"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const values = parsed.data;
  const variantId = values.variantId ?? null;

  if (variantId) {
    const [variant] = await db
      .select({ id: productVariants.id, productId: productVariants.productId, tenantId: productVariants.tenantId })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);
    if (!variant || variant.tenantId !== context.tenant.id || variant.productId !== values.productId) {
      return { error: "That variant does not belong to the selected product." };
    }
  }

  const result = await adjustStock({
    tenantId: context.tenant.id,
    branchId: context.activeBranch.id,
    productId: values.productId,
    variantId,
    type: values.type,
    quantity: values.quantity,
    reason: values.reason,
    notes: values.notes || null,
    userId: context.user.id,
  });

  if (!result.ok) return { error: result.error };

  await syncStockLevels([
    {
      tenantId: context.tenant.id,
      branchId: context.activeBranch.id,
      productId: values.productId,
      variantId,
      actorId: context.user.id,
    },
  ]);

  await notifyStockAdjustment({
    tenantId: context.tenant.id,
    tenantName: context.tenant.name,
    branchId: context.activeBranch.id,
    productId: values.productId,
    description: `Stock ${values.type} by ${values.quantity} units at ${context.activeBranch.name}. Reason: ${values.reason}.`,
    actorId: context.user.id,
  });

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "stock.adjusted",
    entityType: "stock_adjustment",
    entityId: result.reference,
    summary: `Adjusted stock (${values.type}) · reference ${result.reference}`,
  });

  revalidatePath("/app/inventory");
  revalidatePath("/app");
  redirect("/app/inventory?adjusted=1");
}

export async function transferStockAction(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("inventory.transfer");

  const transferAccess = await hasFeature(context.tenant.id, "inventory.transfer");
  if (!transferAccess.allowed) {
    return {
      error: `${transferAccess.message ?? "Stock transfers are not available on your plan."} ${transferAccess.upgradeMessage ?? ""}`.trim(),
    };
  }

  const parsed = stockTransferSchema.safeParse({
    productId: formString(formData, "productId"),
    variantId: formString(formData, "variantId") || null,
    toBranchId: formString(formData, "toBranchId"),
    quantity: formString(formData, "quantity"),
    notes: formString(formData, "notes"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const values = parsed.data;
  const variantId = values.variantId ?? null;

  if (variantId) {
    const [variant] = await db
      .select({ id: productVariants.id, productId: productVariants.productId, tenantId: productVariants.tenantId })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);
    if (!variant || variant.tenantId !== context.tenant.id || variant.productId !== values.productId) {
      return { error: "That variant does not belong to the selected product." };
    }
  }

  const result = await transferStock({
    tenantId: context.tenant.id,
    fromBranchId: context.activeBranch.id,
    toBranchId: values.toBranchId,
    productId: values.productId,
    variantId,
    quantity: values.quantity,
    notes: values.notes || null,
    userId: context.user.id,
  });

  if (!result.ok) return { error: result.error };

  await syncStockLevels([
    {
      tenantId: context.tenant.id,
      branchId: context.activeBranch.id,
      productId: values.productId,
      variantId,
      actorId: context.user.id,
    },
    {
      tenantId: context.tenant.id,
      branchId: values.toBranchId,
      productId: values.productId,
      variantId,
      actorId: context.user.id,
    },
  ]);

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "stock.transferred",
    entityType: "stock_transfer",
    entityId: result.reference,
    summary: `Transferred ${values.quantity} unit(s) to another branch · reference ${result.reference}`,
  });

  revalidatePath("/app/inventory");
  revalidatePath("/app");
  redirect("/app/inventory?transferred=1");
}
