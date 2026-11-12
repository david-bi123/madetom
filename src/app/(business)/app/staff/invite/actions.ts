"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, invitations } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { createSecureToken, hashToken } from "@/lib/auth/session";
import { sendSms } from "@/lib/services/sms";
import { normalizePhone } from "@/lib/format";
import { zodState, formString, type ActionState } from "@/lib/action-state";
import { staffInviteSchema } from "@/lib/validation/staff";
import { assertStaffCapacity } from "@/lib/subscription/entitlements";

const INVITE_TTL_DAYS = 7;

async function baseUrl(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProto ?? (host.startsWith("localhost") ? "http" : "https");
  return process.env.APP_URL ?? `${protocol}://${host}`;
}

export async function inviteStaff(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("staff.manage");
  const tenantId = context.tenant.id;

  const email = formString(formData, "email").toLowerCase();
  const parsed = staffInviteSchema.safeParse({
    name: formString(formData, "name"),
    phone: formString(formData, "phone"),
    email: email || null,
    roleKey: formString(formData, "roleKey"),
    branchId: formString(formData, "branchId"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const values = parsed.data;

  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(
      and(
        eq(branches.id, values.branchId),
        eq(branches.tenantId, tenantId),
        eq(branches.status, "active"),
      ),
    )
    .limit(1);
  if (!branch) return { error: "Choose a branch that belongs to this workspace." };

  const rawToken = createSecureToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400000);

  // Capacity check and invitation insert share a transaction so concurrent
  // invitations cannot exceed the plan's staff limit.
  const invitationId = crypto.randomUUID();
  const outcome = await db.transaction(async (tx) => {
    const staffLimit = await assertStaffCapacity(tx, tenantId, 1);
    if (!staffLimit.allowed) return { kind: "limit" as const, check: staffLimit };

    const [duplicate] = await tx
      .select({ id: invitations.id })
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, tenantId),
          eq(invitations.phone, normalizePhone(values.phone)),
          eq(invitations.status, "pending"),
        ),
      )
      .limit(1);
    if (duplicate) return { kind: "duplicate" as const };

    await tx.insert(invitations).values({
      id: invitationId,
      tenantId,
      type: "staff",
      name: values.name,
      email: values.email,
      phone: normalizePhone(values.phone),
      roleKey: values.roleKey,
      branchId: branch.id,
      tokenHash: hashToken(rawToken),
      status: "pending",
      deliveryStatus: "pending",
      expiresAt,
      createdBy: context.user.id,
    });

    return { kind: "created" as const };
  });

  if (outcome.kind === "duplicate") {
    return { error: "This phone number already has a pending invitation." };
  }
  if (outcome.kind === "limit") {
    return {
      error: outcome.check.message ?? undefined,
      fieldErrors: {
        phone: [`${outcome.check.message ?? ""} ${outcome.check.upgradeMessage ?? ""}`.trim()],
      },
    };
  }

  const link = `${await baseUrl()}/setup/${rawToken}`;
  const sms = await sendSms({
    tenantId,
    phone: normalizePhone(values.phone),
    message: `${values.name}, you have been invited to join ${context.tenant.name} on Madetom. Set up your account: ${link} The link expires in ${INVITE_TTL_DAYS} days.`,
    displayMessage: `${values.name}, you have been invited to join ${context.tenant.name} on Madetom. Open the secure link to set up your account. Link expires in ${INVITE_TTL_DAYS} days.`,
    purpose: "staff_invitation",
    relatedType: "invitation",
    createdBy: context.user.id,
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
        eq(invitations.phone, normalizePhone(values.phone)),
        eq(invitations.status, "pending"),
      ),
    );

  await writeAudit({
    tenantId,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "staff.invited",
    entityType: "invitation",
    summary: `Invited ${values.name} as ${values.roleKey.replaceAll("_", " ")}`,
  });

  if (sms.status !== "sent") {
    return {
      error:
        sms.error ??
        "The invitation was saved but the SMS could not be sent. Check the SMS wallet balance and try again.",
    };
  }

  return { success: `Invitation sent to ${values.phone}.` };
}
