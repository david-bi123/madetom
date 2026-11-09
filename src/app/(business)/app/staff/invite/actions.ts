"use server";

import { headers } from "next/headers";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, invitations, tenantMemberships } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { createSecureToken, hashToken } from "@/lib/auth/session";
import { sendSms } from "@/lib/services/sms";
import { normalizePhone } from "@/lib/format";
import { zodState, formString, type ActionState } from "@/lib/action-state";
import { staffInviteSchema } from "@/lib/validation/staff";

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

  const plan = context.plan;
  if (plan) {
    const [staffCount] = await db
      .select({ value: count() })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.status, "active"),
        ),
      );
    if (Number(staffCount?.value ?? 0) >= plan.maxEmployees) {
      return {
        error: `Your ${plan.name} plan allows ${plan.maxEmployees} team members. Upgrade the plan to invite more.`,
      };
    }
  }

  const [pending] = await db
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
  if (pending) {
    return { error: "This phone number already has a pending invitation." };
  }

  const rawToken = createSecureToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400000);

  await db.insert(invitations).values({
    id: crypto.randomUUID(),
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
