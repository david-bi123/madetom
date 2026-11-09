"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { formString, successState, zodState, type ActionState } from "@/lib/action-state";
import { categoryFormSchema } from "@/lib/validation/category";

function valuesFromFormData(formData: FormData): Record<string, unknown> {
  const description = formData.get("description");
  return {
    name: formString(formData, "name"),
    description: typeof description === "string" && description.trim() ? description.trim() : null,
  };
}

export async function createCategory(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("categories.manage");
  const parsed = categoryFormSchema.safeParse(valuesFromFormData(formData));
  if (!parsed.success) return zodState(parsed.error);

  const values = parsed.data;
  const [duplicate] = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(
      and(
        eq(productCategories.tenantId, context.tenant.id),
        eq(productCategories.name, values.name),
      ),
    )
    .limit(1);
  if (duplicate) return { error: "A category with this name already exists." };

  const categoryId = crypto.randomUUID();
  await db.insert(productCategories).values({
    id: categoryId,
    tenantId: context.tenant.id,
    name: values.name,
    description: values.description,
  });

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "category.created",
    entityType: "product_category",
    entityId: categoryId,
    summary: `Category ${values.name} created`,
  });

  revalidatePath("/app/categories");
  revalidatePath("/app/products");
  redirect("/app/categories?created=1");
}

export async function updateCategory(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("categories.manage");
  const categoryId = formString(formData, "id");
  if (!categoryId) return { error: "Category is missing." };

  const parsed = categoryFormSchema.safeParse(valuesFromFormData(formData));
  if (!parsed.success) return zodState(parsed.error);

  const values = parsed.data;
  const [existing] = await db
    .select({ id: productCategories.id, tenantId: productCategories.tenantId })
    .from(productCategories)
    .where(eq(productCategories.id, categoryId))
    .limit(1);
  if (!existing || existing.tenantId !== context.tenant.id) {
    return { error: "The category could not be found in this workspace." };
  }

  const [duplicate] = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(
      and(
        eq(productCategories.tenantId, context.tenant.id),
        eq(productCategories.name, values.name),
      ),
    )
    .limit(1);
  if (duplicate && duplicate.id !== categoryId) {
    return { error: "A category with this name already exists." };
  }

  await db
    .update(productCategories)
    .set({ name: values.name, description: values.description })
    .where(eq(productCategories.id, categoryId));

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "category.updated",
    entityType: "product_category",
    entityId: categoryId,
    summary: `Category ${values.name} updated`,
  });

  revalidatePath("/app/categories");
  revalidatePath("/app/products");
  revalidatePath(`/app/categories/${categoryId}`);
  return successState("Category updated.");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const context = await requireBusiness("categories.manage");
  const categoryId = formString(formData, "id");
  if (!categoryId) return;

  const [existing] = await db
    .select({ id: productCategories.id, name: productCategories.name, tenantId: productCategories.tenantId })
    .from(productCategories)
    .where(eq(productCategories.id, categoryId))
    .limit(1);
  if (!existing || existing.tenantId !== context.tenant.id) return;

  // Products keep their history; the foreign key sets their category to null.
  await db.delete(productCategories).where(eq(productCategories.id, categoryId));

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "category.deleted",
    entityType: "product_category",
    entityId: categoryId,
    summary: `Category ${existing.name} deleted`,
  });

  revalidatePath("/app/categories");
  revalidatePath("/app/products");
}
