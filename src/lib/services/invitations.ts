import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  invitations,
  subscriptionPlans,
  subscriptions,
  tenants,
} from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/session";

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
