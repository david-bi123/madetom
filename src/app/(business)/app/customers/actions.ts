"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { normalizePhone } from "@/lib/format";
import { formString, zodState, type ActionState } from "@/lib/action-state";
import { customerSchema } from "@/lib/validation/party";

export async function createCustomer(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("customers.manage");

  const parsed = customerSchema.safeParse({
    name: formString(formData, "name"),
    phone: formString(formData, "phone"),
    email: formString(formData, "email"),
    address: formString(formData, "address"),
    notes: formString(formData, "notes"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const values = parsed.data;

  const phone = values.phone ? normalizePhone(values.phone) : null;
  if (phone) {
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.tenantId, context.tenant.id), eq(customers.phone, phone)))
      .limit(1);
    if (existing) {
      return { error: "A customer with that phone number already exists in this workspace." };
    }
  }

  const customerId = crypto.randomUUID();
  await db.insert(customers).values({
    id: customerId,
    tenantId: context.tenant.id,
    name: values.name,
    phone,
    email: values.email ? values.email.toLowerCase() : null,
    address: values.address || null,
    notes: values.notes || null,
  });

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "customer.created",
    entityType: "customer",
    entityId: customerId,
    summary: `Added customer ${values.name}`,
  });

  revalidatePath("/app/customers");
  redirect("/app/customers?created=1");
}

export async function archiveCustomer(formData: FormData): Promise<void> {
  const context = await requireBusiness("customers.manage");
  const customerId = formString(formData, "customerId");
  if (!customerId) return;

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, context.tenant.id)))
    .limit(1);
  if (!customer) return;

  await db
    .update(customers)
    .set({ status: "archived" })
    .where(eq(customers.id, customerId));

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "customer.archived",
    entityType: "customer",
    entityId: customerId,
    summary: "Archived a customer record",
  });

  revalidatePath("/app/customers");
}
