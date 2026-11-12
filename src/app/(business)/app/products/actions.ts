"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productStock, productVariants, products, variantStock } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { fromMinor, toMinor } from "@/lib/format";
import { productFormSchema } from "@/lib/validation/product";
import { variantFormSchema } from "@/lib/validation/variant";
import { successState, zodState, type ActionState } from "@/lib/action-state";
import { formString } from "@/lib/action-state";
import { assertProductCapacity } from "@/lib/subscription/entitlements";

function valuesFromFormData(formData: FormData): Record<string, unknown> {
  const categoryId = formData.get("categoryId");
  const supplierId = formData.get("supplierId");
  const description = formData.get("description");
  const imageUrl = formData.get("imageUrl");
  const taxRate = formData.get("taxRate");
  const barcode = formData.get("barcode");
  return {
    name: formString(formData, "name"),
    sku: formString(formData, "sku"),
    barcode: typeof barcode === "string" && barcode.trim() ? barcode.trim() : null,
    categoryId: typeof categoryId === "string" && categoryId.trim() ? categoryId.trim() : null,
    supplierId: typeof supplierId === "string" && supplierId.trim() ? supplierId.trim() : null,
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    imageUrl: typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null,
    costPrice: formString(formData, "costPrice") || "0",
    sellingPrice: formString(formData, "sellingPrice") || "0",
    reorderLevel: formString(formData, "reorderLevel") || "0",
    unit: formString(formData, "unit") || "piece",
    taxRate: typeof taxRate === "string" && taxRate.trim() ? taxRate.trim() : null,
    // Checkboxes arrive as "true"/absent, so they are normalised to strings
    // before the schema reads them.
    hasVariants: String(formData.get("hasVariants") === "true"),
    trackInventory: String(formData.get("trackInventory") === "true"),
    status: formString(formData, "status") || "active",
  };
}

export async function createProduct(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("products.manage");
  const parsed = productFormSchema.safeParse(valuesFromFormData(formData));
  if (!parsed.success) return zodState(parsed.error);

  const values = parsed.data;
  const [duplicate] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.tenantId, context.tenant.id), eq(products.sku, values.sku)))
    .limit(1);
  if (duplicate) return { error: "A product with this SKU already exists in the workspace." };

  const productId = crypto.randomUUID();

  // The limit check and insert share one transaction so two concurrent requests
  // cannot both consume the last available product slot.
  const capacity = await db.transaction(async (tx) => {
    const productLimit = await assertProductCapacity(tx, context.tenant.id, 1);
    if (!productLimit.allowed) return productLimit;

    await tx.insert(products).values({
      id: productId,
      tenantId: context.tenant.id,
      categoryId: values.categoryId,
      supplierId: values.supplierId,
      name: values.name,
      sku: values.sku,
      barcode: values.barcode,
      description: values.description,
      imageUrl: values.imageUrl,
      costPrice: fromMinor(toMinor(values.costPrice)),
      sellingPrice: fromMinor(toMinor(values.sellingPrice)),
      reorderLevel: values.reorderLevel,
      unit: values.unit,
      taxRate: values.taxRate,
      hasVariants: values.hasVariants,
      trackInventory: values.trackInventory,
      status: values.status,
    });

    if (values.trackInventory && values.status === "active") {
      await tx.insert(productStock).values({
        id: crypto.randomUUID(),
        tenantId: context.tenant.id,
        productId,
        branchId: context.activeBranch.id,
        quantity: 0,
        reorderLevel: values.reorderLevel,
      });
    }

    return null;
  });

  if (capacity && !capacity.allowed) {
    return {
      error: capacity.message ?? "Your plan does not allow another product.",
      fieldErrors: {
        name: [`${capacity.message ?? ""} ${capacity.upgradeMessage ?? ""}`.trim()],
      },
    };
  }

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "product.created",
    entityType: "product",
    entityId: productId,
    summary: `Product ${values.name} created`,
  });

  revalidatePath("/app/products");
  revalidatePath("/app");
  redirect("/app/products?created=1");
}

export async function updateProduct(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("products.manage");
  const productId = formData.get("id");
  if (typeof productId !== "string" || !productId) return { error: "Product is missing." };

  const parsed = productFormSchema.safeParse(valuesFromFormData(formData));
  if (!parsed.success) return zodState(parsed.error);

  const values = parsed.data;
  const [existing] = await db
    .select({ id: products.id, tenantId: products.tenantId })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!existing || existing.tenantId !== context.tenant.id) {
    return { error: "The product could not be found in this workspace." };
  }

  await db
    .update(products)
    .set({
      name: values.name,
      sku: values.sku,
      barcode: values.barcode,
      categoryId: values.categoryId,
      supplierId: values.supplierId,
      description: values.description,
      imageUrl: values.imageUrl,
      costPrice: fromMinor(toMinor(values.costPrice)),
      sellingPrice: fromMinor(toMinor(values.sellingPrice)),
      reorderLevel: values.reorderLevel,
      unit: values.unit,
      taxRate: values.taxRate,
      hasVariants: values.hasVariants,
      trackInventory: values.trackInventory,
      status: values.status,
    })
    .where(eq(products.id, productId));

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "product.updated",
    entityType: "product",
    entityId: productId,
    summary: `Product ${values.name} updated`,
  });

  revalidatePath("/app/products");
  return { success: "Product updated." };
}

export async function archiveProduct(formData: FormData): Promise<void> {
  const context = await requireBusiness("products.manage");
  const productId = formData.get("id");
  if (typeof productId !== "string" || !productId) return;

  const [existing] = await db
    .select({ id: products.id, tenantId: products.tenantId, name: products.name })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!existing || existing.tenantId !== context.tenant.id) return;

  await db.update(products).set({ status: "archived" }).where(eq(products.id, productId));
  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "product.archived",
    entityType: "product",
    entityId: productId,
    summary: `Product ${existing.name} archived`,
  });

  revalidatePath("/app/products");
}

/* -------------------------------------------------------------------------- */
/* Variants                                                                   */
/* -------------------------------------------------------------------------- */

function variantValuesFromFormData(formData: FormData): Record<string, unknown> {
  const barcode = formData.get("barcode");
  return {
    name: formString(formData, "name"),
    sku: formString(formData, "sku"),
    barcode: typeof barcode === "string" && barcode.trim() ? barcode.trim() : null,
    costPrice: formString(formData, "costPrice") || "0",
    sellingPrice: formString(formData, "sellingPrice") || "0",
    reorderLevel: formString(formData, "reorderLevel") || "0",
    status: formString(formData, "status") || "active",
  };
}

export async function createVariant(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("products.manage");
  const productId = formString(formData, "productId");
  if (!productId) return { error: "Product is missing." };

  const [product] = await db
    .select({ id: products.id, tenantId: products.tenantId, name: products.name, trackInventory: products.trackInventory })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product || product.tenantId !== context.tenant.id) {
    return { error: "The product could not be found in this workspace." };
  }

  const parsed = variantFormSchema.safeParse(variantValuesFromFormData(formData));
  if (!parsed.success) return zodState(parsed.error);
  const values = parsed.data;

  const [duplicateVariant] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(and(eq(productVariants.tenantId, context.tenant.id), eq(productVariants.sku, values.sku)))
    .limit(1);
  if (duplicateVariant) return { error: "A variant with this SKU already exists." };

  const [duplicateProduct] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.tenantId, context.tenant.id), eq(products.sku, values.sku)))
    .limit(1);
  if (duplicateProduct) return { error: "That SKU is already used by a product." };

  const variantId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(productVariants).values({
      id: variantId,
      tenantId: context.tenant.id,
      productId,
      name: values.name,
      sku: values.sku,
      barcode: values.barcode,
      costPrice: fromMinor(toMinor(values.costPrice)),
      sellingPrice: fromMinor(toMinor(values.sellingPrice)),
      reorderLevel: values.reorderLevel,
      status: values.status,
    });
    if (product.trackInventory) {
      await tx
        .insert(variantStock)
        .values({
          id: crypto.randomUUID(),
          tenantId: context.tenant.id,
          variantId,
          productId,
          branchId: context.activeBranch.id,
          quantity: 0,
          reorderLevel: values.reorderLevel,
        })
        .onDuplicateKeyUpdate({ set: { reorderLevel: values.reorderLevel } });
    }
    await tx.update(products).set({ hasVariants: true }).where(eq(products.id, productId));
  });

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "variant.created",
    entityType: "product_variant",
    entityId: variantId,
    summary: `Variant ${values.name} added to ${product.name}`,
  });

  revalidatePath(`/app/products/${productId}`);
  revalidatePath("/app/products");
  revalidatePath("/app/pos");
  return successState("Variant created.");
}

export async function updateVariant(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("products.manage");
  const variantId = formString(formData, "id");
  if (!variantId) return { error: "Variant is missing." };

  const parsed = variantFormSchema.safeParse(variantValuesFromFormData(formData));
  if (!parsed.success) return zodState(parsed.error);
  const values = parsed.data;

  const [existing] = await db
    .select({ id: productVariants.id, tenantId: productVariants.tenantId, productId: productVariants.productId })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);
  if (!existing || existing.tenantId !== context.tenant.id) {
    return { error: "The variant could not be found in this workspace." };
  }

  const [duplicateVariant] = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(and(eq(productVariants.tenantId, context.tenant.id), eq(productVariants.sku, values.sku)))
    .limit(1);
  if (duplicateVariant && duplicateVariant.id !== variantId) {
    return { error: "A variant with this SKU already exists." };
  }

  const [duplicateProduct] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.tenantId, context.tenant.id), eq(products.sku, values.sku)))
    .limit(1);
  if (duplicateProduct) return { error: "That SKU is already used by a product." };

  await db
    .update(productVariants)
    .set({
      name: values.name,
      sku: values.sku,
      barcode: values.barcode,
      costPrice: fromMinor(toMinor(values.costPrice)),
      sellingPrice: fromMinor(toMinor(values.sellingPrice)),
      reorderLevel: values.reorderLevel,
      status: values.status,
    })
    .where(eq(productVariants.id, variantId));

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "variant.updated",
    entityType: "product_variant",
    entityId: variantId,
    summary: `Variant ${values.name} updated`,
  });

  revalidatePath(`/app/products/${existing.productId}`);
  revalidatePath("/app/products");
  revalidatePath("/app/pos");
  return successState("Variant updated.");
}

export async function archiveVariant(formData: FormData): Promise<void> {
  const context = await requireBusiness("products.manage");
  const variantId = formString(formData, "id");
  if (!variantId) return;

  const [existing] = await db
    .select({
      id: productVariants.id,
      name: productVariants.name,
      tenantId: productVariants.tenantId,
      productId: productVariants.productId,
    })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);
  if (!existing || existing.tenantId !== context.tenant.id) return;

  await db.update(productVariants).set({ status: "archived" }).where(eq(productVariants.id, variantId));

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "variant.archived",
    entityType: "product_variant",
    entityId: variantId,
    summary: `Variant ${existing.name} archived`,
  });

  revalidatePath(`/app/products/${existing.productId}`);
  revalidatePath("/app/products");
  revalidatePath("/app/pos");
}
