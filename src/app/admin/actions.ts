"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  branches,
  invitations,
  platformSettings,
  smsWallets,
  tenants,
  users,
} from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { createSecureToken, hashToken } from "@/lib/auth/session";
import { sendSms, adjustSmsCredits } from "@/lib/services/sms";
import { normalizePhone } from "@/lib/format";
import { zodState, formString, type ActionState } from "@/lib/action-state";
import { emailSchema, phoneSchema } from "@/lib/validation/auth";
import { runPlatformDailyReport } from "@/lib/services/notifications";

const organisationSchema = z.object({
  businessName: z.string().trim().min(2, "Enter the business name.").max(160),
  businessType: z.string().trim().min(2, "Enter the business type.").max(80),
  ownerName: z.string().trim().min(2, "Enter the owner's full name.").max(120),
  ownerPhone: phoneSchema,
  ownerEmail: emailSchema,
  branchName: z.string().trim().min(2, "Name the first branch.").max(120),
});

async function baseUrl(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProto ?? (host.startsWith("localhost") ? "http" : "https");
  return process.env.APP_URL ?? `${protocol}://${host}`;
}

function slugifyBusiness(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .slice(0, 70) || `org-${Date.now().toString(36)}`
  );
}

export async function createOrganisation(state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();

  const parsed = organisationSchema.safeParse({
    businessName: formString(formData, "businessName"),
    businessType: formString(formData, "businessType"),
    ownerName: formString(formData, "ownerName"),
    ownerPhone: formString(formData, "ownerPhone"),
    ownerEmail: formString(formData, "ownerEmail").toLowerCase(),
    branchName: formString(formData, "branchName"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const values = parsed.data;

  const baseSlug = slugifyBusiness(values.businessName);
  let slug = baseSlug;
  for (let attempt = 2; attempt < 100; attempt += 1) {
    const [existing] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!existing) break;
    slug = `${baseSlug}-${attempt}`;
  }

  const tenantId = crypto.randomUUID();
  const branchId = crypto.randomUUID();
  const rawToken = createSecureToken();
  const expiresAt = new Date(Date.now() + 14 * 86400000);

  await db.transaction(async (tx) => {
    await tx.insert(tenants).values({
      id: tenantId,
      name: values.businessName,
      slug,
      businessType: values.businessType,
      country: "Ghana",
      phone: normalizePhone(values.ownerPhone),
      email: values.ownerEmail,
      currency: "GHS",
      status: "pending",
      createdBy: admin.id,
    });

    await tx.insert(branches).values({
      id: branchId,
      tenantId,
      name: values.branchName,
      code: "MAIN",
      isDefault: true,
    });

    await tx.insert(invitations).values({
      id: crypto.randomUUID(),
      tenantId,
      type: "owner",
      name: values.ownerName,
      email: values.ownerEmail,
      phone: normalizePhone(values.ownerPhone),
      roleKey: "owner",
      branchId,
      tokenHash: hashToken(rawToken),
      status: "pending",
      deliveryStatus: "pending",
      expiresAt,
      createdBy: admin.id,
    });

    await tx.insert(smsWallets).values({
      id: crypto.randomUUID(),
      tenantId,
      credits: 0,
    });
  });

  const link = `${await baseUrl()}/setup/${rawToken}`;
  const sms = await sendSms({
    tenantId,
    phone: normalizePhone(values.ownerPhone),
    message: `Welcome to Madetom, ${values.ownerName}. Set up ${values.businessName} here: ${link} The link expires in 14 days.`,
    displayMessage: `Welcome to Madetom, ${values.ownerName}. Set up ${values.businessName} with the secure link. It expires in 14 days.`,
    purpose: "owner_invitation",
    relatedType: "invitation",
    createdBy: admin.id,
  });

  await db
    .update(invitations)
    .set({
      deliveryStatus: sms.status === "sent" ? "sent" : "failed",
      lastSentAt: new Date(),
      sendCount: 1,
    })
    .where(
      and(
        eq(invitations.tenantId, tenantId),
        eq(invitations.type, "owner"),
        eq(invitations.status, "pending"),
      ),
    );

  await writeAudit({
    tenantId,
    actorUserId: admin.id,
    actorName: admin.name,
    action: "org.created",
    entityType: "tenant",
    entityId: tenantId,
    summary: `Created organisation ${values.businessName} and invited ${values.ownerName}`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organisations");

  if (sms.status !== "sent") {
    return {
      error:
        sms.error ??
        "The organisation was created, but the invitation SMS could not be sent. Top up the SMS wallet and resend.",
    };
  }
  return { success: `${values.businessName} created and the owner has been invited.` };
}

export async function setTenantStatus(formData: FormData): Promise<void> {
  const admin = await requireSuperAdmin();
  const tenantId = formString(formData, "tenantId");
  const status = formString(formData, "status");
  if (!tenantId || !["active", "suspended"].includes(status)) return;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return;

  await db
    .update(tenants)
    .set({
      status: status as "active" | "suspended",
      suspendedReason: status === "suspended" ? formString(formData, "reason") || null : null,
    })
    .where(eq(tenants.id, tenantId));

  await writeAudit({
    tenantId,
    actorUserId: admin.id,
    actorName: admin.name,
    action: status === "suspended" ? "org.suspended" : "org.activated",
    entityType: "tenant",
    entityId: tenantId,
    summary: `${tenant.name} ${status === "suspended" ? "suspended" : "reactivated"}`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organisations");
  revalidatePath(`/admin/organisations/${tenantId}`);
}

export async function revokeInvitation(formData: FormData): Promise<void> {
  const admin = await requireSuperAdmin();
  const invitationId = formString(formData, "invitationId");
  if (!invitationId) return;

  const [invitation] = await db.select().from(invitations).where(eq(invitations.id, invitationId)).limit(1);
  if (!invitation || invitation.status !== "pending") return;

  await db
    .update(invitations)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(invitations.id, invitationId));

  await writeAudit({
    tenantId: invitation.tenantId,
    actorUserId: admin.id,
    actorName: admin.name,
    action: "invitation.revoked",
    entityType: "invitation",
    entityId: invitationId,
    summary: `Revoked invitation for ${invitation.name}`,
  });

  revalidatePath("/admin/invitations");
}

export async function creditSmsWallet(state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const tenantId = formString(formData, "tenantId");
  const credits = Number(formString(formData, "credits"));
  const description = formString(formData, "description");

  if (!tenantId) return { error: "Choose the organisation." };
  if (!Number.isInteger(credits) || credits === 0) return { error: "Enter a non-zero whole number of credits." };
  if (!description) return { error: "Add a short reason for this adjustment." };

  try {
    const result = await adjustSmsCredits({
      tenantId,
      credits,
      description,
      actorId: admin.id,
      actorName: admin.name,
    });

    await writeAudit({
      tenantId,
      actorUserId: admin.id,
      actorName: admin.name,
      action: "sms.credits_adjusted",
      entityType: "sms_wallet",
      entityId: tenantId,
      summary: `${credits > 0 ? "Added" : "Removed"} ${Math.abs(credits)} SMS credits · ${description}`,
      metadata: { balance: result.balance },
    });

    revalidatePath("/admin/sms");
    return { success: `Wallet updated. Balance is now ${result.balance} credits.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The credits could not be adjusted." };
  }
}

export async function updatePlatformSetting(state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const key = formString(formData, "key");
  const value = formString(formData, "value");
  if (!key) return { error: "The setting key is missing." };

  let parsedValue: unknown = value;
  try {
    parsedValue = value ? JSON.parse(value) : null;
  } catch {
    parsedValue = value;
  }

  await db
    .insert(platformSettings)
    .values({ key, value: parsedValue, updatedBy: admin.id })
    .onDuplicateKeyUpdate({ set: { value: parsedValue, updatedBy: admin.id } });

  await writeAudit({
    actorUserId: admin.id,
    actorName: admin.name,
    action: "platform.setting_updated",
    entityType: "platform_setting",
    entityId: key,
    summary: `Platform setting ${key} updated`,
  });

  revalidatePath("/admin/settings");
  return { success: "Setting saved." };
}

export async function sendPlatformReport(): Promise<{ ok: boolean; error?: string; report?: any }> {
  const [superAdmin] = await db
    .select({ id: users.id, phone: users.phone, name: users.name })
    .from(users)
    .where(eq(users.isSuperAdmin, true))
    .limit(1);

  if (!superAdmin) {
    return { ok: false, error: "No super admin account found." };
  }

  if (!superAdmin.phone) {
    return { ok: false, error: "The super admin account has no phone number on file." };
  }

  try {
    const result = await runPlatformDailyReport();
    return { ok: true, report: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Report failed to send." };
  }
}
