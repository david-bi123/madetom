"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { normalizePhone } from "@/lib/format";
import { formString, zodState, type ActionState } from "@/lib/action-state";
import { supplierSchema } from "@/lib/validation/party";

export async function createSupplier(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("suppliers.manage");

  const parsed = supplierSchema.safeParse({
    name: formString(formData, "name"),
    contactName: formString(formData, "contactName"),
    phone: formString(formData, "phone"),
    email: formString(formData, "email"),
    address: formString(formData, "address"),
    notes: formString(formData, "notes"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const values = parsed.data;

  const supplierId = crypto.randomUUID();
  await db.insert(suppliers).values({
    id: supplierId,
    tenantId: context.tenant.id,
    name: values.name,
    contactName: values.contactName || null,
    phone: values.phone ? normalizePhone(values.phone) : null,
    email: values.email ? values.email.toLowerCase() : null,
    address: values.address || null,
    notes: values.notes || null,
  });

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "supplier.created",
    entityType: "supplier",
    entityId: supplierId,
    summary: `Added supplier ${values.name}`,
  });

  revalidatePath("/app/suppliers");
  redirect("/app/suppliers?created=1");
}

export async function archiveSupplier(formData: FormData): Promise<void> {
  const context = await requireBusiness("suppliers.manage");
  const supplierId = formString(formData, "supplierId");
  if (!supplierId) return;

  const [supplier] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, context.tenant.id)))
    .limit(1);
  if (!supplier) return;

  await db
    .update(suppliers)
    .set({ status: "archived" })
    .where(eq(suppliers.id, supplierId));

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "supplier.archived",
    entityType: "supplier",
    entityId: supplierId,
    summary: "Archived a supplier record",
  });

  revalidatePath("/app/suppliers");
}
