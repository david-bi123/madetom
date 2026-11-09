"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { businessSettingsSchema } from "@/lib/validation/settings";
import { zodState, type ActionState, formString } from "@/lib/action-state";

export async function updateBusinessSettings(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("settings.manage");

  const region = formString(formData, "region");
  const location = formString(formData, "location");
  const parsed = businessSettingsSchema.safeParse({
    name: formString(formData, "name"),
    businessType: formString(formData, "businessType"),
    region: region || null,
    location: location || null,
    phone: formString(formData, "phone"),
    email: formString(formData, "email"),
    taxRate: formString(formData, "taxRate") || "0",
    // Checkboxes arrive as "true"/absent, so they are normalised to strings
    // before the schema reads them.
    pricesIncludeTax: String(formData.get("pricesIncludeTax") === "true"),
    allowPartialPayments: String(formData.get("allowPartialPayments") === "true"),
  });
  if (!parsed.success) return zodState(parsed.error);

  const values = parsed.data;

  await db
    .update(tenants)
    .set({
      name: values.name,
      businessType: values.businessType,
      region: values.region,
      location: values.location,
      phone: values.phone,
      email: values.email,
      taxRate: values.taxRate,
      pricesIncludeTax: values.pricesIncludeTax,
      allowPartialPayments: values.allowPartialPayments,
    })
    .where(eq(tenants.id, context.tenant.id));

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "tenant.settings_updated",
    entityType: "tenant",
    entityId: context.tenant.id,
    summary: `Business settings updated for ${values.name}`,
  });

  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { success: "Business settings saved." };
}
