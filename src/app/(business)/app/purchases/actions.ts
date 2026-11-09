"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { recordPurchase } from "@/lib/services/purchases";
import { syncStockLevels } from "@/lib/services/notifications";
import { parseMoneyInput } from "@/lib/format";
import { formString, type ActionState } from "@/lib/action-state";

export async function createPurchaseAction(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("purchases.manage");
  const tenantId = context.tenant.id;

  const supplierId = formString(formData, "supplierId");
  if (!supplierId) return { error: "Choose the supplier you bought from." };

  const [supplier] = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)))
    .limit(1);
  if (!supplier) return { error: "Choose a supplier that belongs to this workspace." };

  const productIds = formData.getAll("lineProductId").map((value) =>
    typeof value === "string" ? value.trim() : "",
  );
  const quantities = formData.getAll("lineQuantity").map((value) =>
    typeof value === "string" ? value.trim() : "",
  );
  const unitCosts = formData.getAll("lineUnitCost").map((value) =>
    typeof value === "string" ? value.trim() : "",
  );

  if (productIds.length === 0 || productIds.every((id) => !id)) {
    return { error: "Add at least one product to the purchase." };
  }

  const lines = [];
  for (let index = 0; index < productIds.length; index += 1) {
    const productId = productIds[index];
    if (!productId) continue;
    const quantity = Number(quantities[index] ?? 0);
    const unitCostMinor = parseMoneyInput(unitCosts[index] ?? "0");
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { error: "Every line needs a whole quantity above zero." };
    }
    if (unitCostMinor <= 0) {
      return { error: "Every line needs a unit cost above zero." };
    }
    lines.push({ productId, quantity, unitCostMinor });
  }

  if (lines.length === 0) return { error: "Add at least one product to the purchase." };

  const method = formString(formData, "method");
  if (!["cash", "momo", "bank", "card", "credit"].includes(method)) {
    return { error: "Choose how the purchase was paid for." };
  }

  const amountPaidMinor =
    method === "credit" ? 0 : parseMoneyInput(formString(formData, "amountPaid"));

  const result = await recordPurchase({
    tenantId,
    branchId: context.activeBranch.id,
    supplierId,
    lines,
    amountPaidMinor,
    method: method as "cash" | "momo" | "bank" | "card" | "credit",
    reference: formString(formData, "reference") || null,
    notes: formString(formData, "notes") || null,
    userId: context.user.id,
  });

  if (!result.ok) return { error: result.error };

  const touched = new Map<string, string>();
  for (const line of lines) touched.set(line.productId, line.productId);
  await syncStockLevels(
    [...touched.values()].map((productId) => ({
      tenantId,
      branchId: context.activeBranch.id,
      productId,
      variantId: null,
      actorId: context.user.id,
    })),
  );

  await writeAudit({
    tenantId,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "purchase.received",
    entityType: "purchase",
    entityId: result.purchaseId,
    summary: `Received purchase ${result.reference} from ${supplier.name}`,
  });

  revalidatePath("/app/purchases");
  revalidatePath("/app/inventory");
  revalidatePath("/app/reports");
  redirect("/app/purchases?created=1");
}
