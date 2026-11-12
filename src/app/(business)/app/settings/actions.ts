"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { branches, tenants } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { businessSettingsSchema } from "@/lib/validation/settings";
import { zodState, type ActionState, formString } from "@/lib/action-state";
import { assertBranchCapacity } from "@/lib/subscription/entitlements";

const branchSchema = z.object({
  name: z.string().trim().min(2, "Enter the branch name.").max(120),
  code: z.string().trim().min(1, "Enter a branch code.").max(16).toUpperCase(),
  address: z.string().trim().max(255, "Address is too long.").optional().or(z.literal("")),
  phone: z.string().trim().max(40, "Phone is too long.").optional().or(z.literal("")),
});

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

export async function createBranch(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("branches.manage");
  const tenantId = context.tenant.id;

  const parsed = branchSchema.safeParse({
    name: formString(formData, "name"),
    code: formString(formData, "code"),
    address: formString(formData, "address", false),
    phone: formString(formData, "phone", false),
  });
  if (!parsed.success) return zodState(parsed.error);
  const values = parsed.data;

  const branchId = crypto.randomUUID();
  const outcome = await db.transaction(async (tx) => {
    // Capacity check and insert share a transaction so concurrent requests
    // cannot exceed the plan's branch limit.
    const branchLimit = await assertBranchCapacity(tx, tenantId, 1);
    if (!branchLimit.allowed) return { kind: "limit" as const, check: branchLimit };

    const [duplicate] = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.tenantId, tenantId), eq(branches.code, values.code)))
      .limit(1);
    if (duplicate) return { kind: "duplicate" as const };

    const existingBranches = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.tenantId, tenantId))
      .limit(1);
    const isFirstBranch = existingBranches.length === 0;

    await tx.insert(branches).values({
      id: branchId,
      tenantId,
      name: values.name,
      code: values.code,
      address: values.address || null,
      phone: values.phone || null,
      isDefault: isFirstBranch,
      status: "active",
    });

    return { kind: "created" as const };
  });

  if (outcome.kind === "duplicate") return { error: "A branch with this code already exists." };
  if (outcome.kind === "limit") {
    return {
      error: outcome.check.message ?? undefined,
      fieldErrors: {
        name: [`${outcome.check.message ?? ""} ${outcome.check.upgradeMessage ?? ""}`.trim()],
      },
    };
  }

  await writeAudit({
    tenantId,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "branch.created",
    entityType: "branch",
    entityId: branchId,
    summary: `Created branch ${values.name} (${values.code})`,
  });

  revalidatePath("/app/settings");
  return { success: `Branch ${values.name} created.` };
}
