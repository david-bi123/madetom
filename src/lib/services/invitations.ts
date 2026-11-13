import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  invitations,
  subscriptionPlans,
  subscriptions,
  tenants,
} from "@/lib/db/schema";
import { createSecureToken, hashToken } from "@/lib/auth/session";
import { sendSms } from "@/lib/services/sms";
import { writeAudit } from "@/lib/audit";
import { normalizePhone } from "@/lib/format";

export type InvitationLookup = {
  invitation: typeof invitations.$inferSelect;
  tenant: typeof tenants.$inferSelect;
  branch: typeof branches.$inferSelect | null;
  plan: typeof subscriptionPlans.$inferSelect | null;
  subscription: typeof subscriptions.$inferSelect | null;
};

/**
 * Resolve an invitation from its raw token. The raw token only exists in the
 * SMS link; the database stores a peppered hash.
 */
export async function findInvitationByToken(rawToken: string): Promise<InvitationLookup | null> {
  if (!rawToken || rawToken.length < 20 || rawToken.length > 200) return null;

  const [row] = await db
    .select({
      invitation: invitations,
      tenant: tenants,
      branch: branches,
      subscription: subscriptions,
      plan: subscriptionPlans,
    })
    .from(invitations)
    .innerJoin(tenants, eq(tenants.id, invitations.tenantId))
    .leftJoin(branches, eq(branches.id, invitations.branchId))
    .leftJoin(subscriptions, eq(subscriptions.tenantId, invitations.tenantId))
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.key, subscriptions.planKey))
    .where(eq(invitations.tokenHash, hashToken(rawToken)))
    .limit(1);

  return row ?? null;
}

export type InvitationBlockReason = "not_found" | "accepted" | "revoked" | "expired" | "suspended";

export function invitationBlockReason(
  lookup: InvitationLookup | null,
  now = new Date(),
): InvitationBlockReason | null {
  if (!lookup) return "not_found";
  if (lookup.invitation.status === "accepted") return "accepted";
  if (lookup.invitation.status === "revoked") return "revoked";
  if (lookup.invitation.status === "expired" || lookup.invitation.expiresAt < now) return "expired";
  if (lookup.tenant.status === "suspended") return "suspended";
  if (lookup.invitation.type === "staff" && lookup.tenant.status !== "active") return "not_found";
  return null;
}

export function invitationBlockMessage(reason: InvitationBlockReason): string {
  switch (reason) {
    case "accepted":
      return "This invitation has already been used. Sign in to your Madetom workspace instead.";
    case "revoked":
      return "This invitation was revoked. Ask your Madetom administrator for a new link.";
    case "expired":
      return "This invitation link has expired. Ask your Madetom administrator to send a fresh one.";
    case "suspended":
      return "This workspace is suspended. Contact Madetom support before continuing.";
    default:
      return "This invitation link is not valid. Check the link in your SMS or ask your administrator for a new one.";
  }
}

export type ResendInvitationResult = {
  ok: boolean;
  sent?: boolean;
  error?: string;
  expiresAt?: Date;
};

/**
 * Issue a fresh invitation link and send it by SMS.
 *
 * The previous token is invalidated by replacing its hash, so only the newest
 * link works. The link always points at the deployed website (see getAppUrl),
 * never at a local development host.
 */
export async function resendOwnerInvitation(input: {
  invitationId: string;
  appUrl: string;
  actorId: string;
  actorName: string;
  expiresInDays?: number;
}): Promise<ResendInvitationResult> {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, input.invitationId))
    .limit(1);

  if (!invitation) return { ok: false, error: "That invitation no longer exists." };
  if (invitation.status !== "pending") {
    return { ok: false, error: "Only a pending invitation can be resent." };
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, invitation.tenantId))
    .limit(1);

  if (!tenant) return { ok: false, error: "The organisation no longer exists." };
  if (tenant.status === "suspended") {
    return { ok: false, error: "This organisation is suspended. Reactivate it first." };
  }

  const phone = invitation.phone ?? tenant.phone;
  if (!phone) {
    return { ok: false, error: "This invitation has no phone number to send the link to." };
  }

  const rawToken = createSecureToken();
  const expiresAt = new Date(Date.now() + (input.expiresInDays ?? 14) * 86400000);

  await db
    .update(invitations)
    .set({
      tokenHash: hashToken(rawToken),
      expiresAt,
      deliveryStatus: "pending",
      lastSentAt: new Date(),
      sendCount: invitation.sendCount + 1,
    })
    .where(eq(invitations.id, invitation.id));

  const link = `${input.appUrl.replace(/\/+$/, "")}/setup/${rawToken}`;
  // Keep the message inside one SMS segment where possible: long messages get
  // split (or truncated by some phones), which breaks the link.
  const expiryLabel = expiresAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const result = await sendSms({
    tenantId: tenant.id,
    phone: normalizePhone(phone),
    message: `Madetom: finish setting up ${tenant.name} here: ${link} (expires ${expiryLabel}).`,
    displayMessage: `Madetom: finish setting up ${tenant.name} with the secure link (expires ${expiryLabel}).`,
    purpose: invitation.type === "owner" ? "owner_invitation" : "staff_invitation",
    relatedType: "invitation",
    relatedId: invitation.id,
    createdBy: input.actorId,
  });

  await db
    .update(invitations)
    .set({ deliveryStatus: result.status === "sent" ? "sent" : "failed" })
    .where(eq(invitations.id, invitation.id));

  await writeAudit({
    tenantId: tenant.id,
    actorUserId: input.actorId,
    actorName: input.actorName,
    action: "invitation.resent",
    entityType: "invitation",
    entityId: invitation.id,
    summary: `Resent the setup link for ${invitation.name} (${result.status})`,
    metadata: { sendCount: invitation.sendCount + 1 },
  });

  if (result.status !== "sent") {
    return {
      ok: false,
      error:
        result.error ??
        "The link could not be sent. Check the SMS wallet balance and the provider settings.",
      expiresAt,
    };
  }

  return { ok: true, sent: true, expiresAt };
}
