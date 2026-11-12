"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  invitations,
  notificationPreferences,
  smsTransactions,
  smsWallets,
  subscriptionPlans,
  subscriptions,
  tenantMemberships,
  tenants,
  users,
} from "@/lib/db/schema";
import { createSession, hashPassword } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  findInvitationByToken,
  invitationBlockMessage,
  invitationBlockReason,
} from "@/lib/services/invitations";
import { normalizePhone } from "@/lib/format";
import {
  formString,
  type ActionState,
  zodState,
} from "@/lib/action-state";
import { setupOwnerSchema, setupStaffSchema } from "@/lib/validation/auth";

class SetupError extends Error {}

function branchCode(name: string, existing: string[]): string {
  const letters = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const base = (letters.slice(0, 3) || "MAIN").padEnd(2, "X");
  if (!existing.includes(base)) return base;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${base.slice(0, 2)}${suffix}`.slice(0, 16);
    if (!existing.includes(candidate)) return candidate;
  }
  return `B${Date.now().toString().slice(-6)}`;
}

function isDuplicateEntry(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  const errno = (error as { errno?: number }).errno;
  return code === "ER_DUP_ENTRY" || errno === 1062;
}

async function requestIp(): Promise<string> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function completeSetup(formData: FormData): Promise<ActionState> {
  const token = formString(formData, "token");
  if (!token) return { error: "The invitation token is missing. Open the link from your SMS again." };

  const lookup = await findInvitationByToken(token);
  const blocked = invitationBlockReason(lookup);
  if (blocked || !lookup) {
    return { error: invitationBlockMessage(blocked ?? "not_found") };
  }
  const invitation = lookup.invitation;

  const ip = await requestIp();
  const limit = await consumeRateLimit(`setup:${ip}`, 12, 15 * 60);
  if (!limit.allowed) {
    return { error: "Too many setup attempts. Wait 15 minutes and try again." };
  }

  const base = {
    token,
    name: formString(formData, "name"),
    email: formString(formData, "email").toLowerCase(),
    password: formString(formData, "password", false),
    confirmPassword: formString(formData, "confirmPassword", false),
    acceptTerms: formData.get("acceptTerms") === "true",
  };

  const parsed =
    invitation.type === "owner"
      ? setupOwnerSchema.safeParse({
          ...base,
          phone: formString(formData, "phone"),
          businessName: formString(formData, "businessName"),
          businessType: formString(formData, "businessType"),
          region: formString(formData, "region"),
          location: formString(formData, "location"),
          branchName: formString(formData, "branchName"),
          branchAddress: formString(formData, "branchAddress"),
          taxRate: formString(formData, "taxRate") || "0",
          pricesIncludeTax: formData.get("pricesIncludeTax") === "true",
          allowPartialPayments: formData.get("allowPartialPayments") === "true",
        })
      : setupStaffSchema.safeParse(base);

  if (!parsed.success) return zodState(parsed.error);

  const data = parsed.data;
  const email = data.email.toLowerCase();

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    return {
      error:
        "An account with this email already exists. Sign in to Madetom, or use a different email address.",
    };
  }

  const passwordHash = await hashPassword(data.password);
  const userId = crypto.randomUUID();
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      const [lockedInvitation] = await tx
        .select()
        .from(invitations)
        .where(eq(invitations.id, invitation.id))
        .for("update");

      if (
        !lockedInvitation ||
        lockedInvitation.status !== "pending" ||
        lockedInvitation.expiresAt < now
      ) {
        throw new SetupError(invitationBlockMessage("expired"));
      }

      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, lockedInvitation.tenantId))
        .for("update");

      if (!tenant) throw new SetupError("This workspace no longer exists.");
      if (tenant.status === "suspended") throw new SetupError(invitationBlockMessage("suspended"));

      if (lockedInvitation.type === "owner") {
        if (tenant.onboardingCompletedAt) {
          throw new SetupError(
            "This workspace is already set up. Sign in to continue, or ask Madetom support for help.",
          );
        }

        const ownerData = setupOwnerSchema.parse({
          ...data,
          token,
        });

        const existingBranches = await tx
          .select({ code: branches.code })
          .from(branches)
          .where(eq(branches.tenantId, tenant.id));
        const branchId = crypto.randomUUID();

        await tx.insert(branches).values({
          id: branchId,
          tenantId: tenant.id,
          name: ownerData.branchName,
          code: branchCode(ownerData.branchName, existingBranches.map((branch) => branch.code)),
          address: ownerData.branchAddress,
          phone: normalizePhone(ownerData.phone),
          isDefault: true,
        });

        await tx.insert(users).values({
          id: userId,
          name: ownerData.name,
          email,
          phone: normalizePhone(ownerData.phone),
          passwordHash,
          status: "active",
        });

        await tx.insert(tenantMemberships).values({
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          userId,
          roleKey: "owner",
          defaultBranchId: branchId,
          status: "active",
          invitedBy: lockedInvitation.createdBy,
        });

        await tx.insert(notificationPreferences).values({
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          userId,
          lowStock: true,
          outOfStock: true,
          dailySummary: true,
          stockAdjustments: true,
          smsStockAdjustment: false,
        });

        await tx
          .update(tenants)
          .set({
            name: ownerData.businessName,
            businessType: ownerData.businessType,
            region: ownerData.region,
            location: ownerData.location,
            phone: normalizePhone(ownerData.phone),
            email,
            taxRate: Number(ownerData.taxRate).toFixed(3),
            pricesIncludeTax: ownerData.pricesIncludeTax,
            allowPartialPayments: ownerData.allowPartialPayments,
            status: "active",
            onboardingCompletedAt: now,
          })
          .where(eq(tenants.id, tenant.id));

        const [subscription] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.tenantId, tenant.id))
          .limit(1);

        let plan = lookup.plan;
        if (!subscription) {
          const [starterPlan] = await tx
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.key, "starter"))
            .limit(1);
          plan = starterPlan ?? null;

          await tx.insert(subscriptions).values({
            id: crypto.randomUUID(),
            tenantId: tenant.id,
            planKey: starterPlan?.key ?? "starter",
            status: "active",
            billingCycle: "monthly",
            billingAmount: starterPlan?.priceMonthly ?? "500.00",
            currency: "GHS",
            trialEndsAt: null,
            currentPeriodStart: now,
            currentPeriodEnd: new Date(now.getTime() + 30 * 86400000),
            notes: "Starter plan assigned automatically when the owner completed business setup.",
          });
        }

        const [wallet] = await tx
          .select()
          .from(smsWallets)
          .where(eq(smsWallets.tenantId, tenant.id))
          .limit(1);

        if (!wallet) {
          const credits = plan?.smsCredits ?? 0;
          await tx.insert(smsWallets).values({
            id: crypto.randomUUID(),
            tenantId: tenant.id,
            credits,
          });
          if (credits > 0) {
            await tx.insert(smsTransactions).values({
              id: crypto.randomUUID(),
              tenantId: tenant.id,
              type: "credit",
              credits,
              balanceAfter: credits,
              reference: `plan-${plan?.key ?? "trial"}`,
              description: `Included SMS credits · ${plan?.name ?? "Trial"}`,
              createdBy: userId,
            });
          }
        }

        await tx
          .update(invitations)
          .set({ status: "accepted", acceptedAt: now })
          .where(eq(invitations.id, lockedInvitation.id));

        await tx
          .update(invitations)
          .set({ status: "revoked", revokedAt: now })
          .where(
            and(
              eq(invitations.tenantId, tenant.id),
              eq(invitations.type, "owner"),
              eq(invitations.status, "pending"),
              ne(invitations.id, lockedInvitation.id),
            ),
          );
      } else {
        if (tenant.status !== "active" || !tenant.onboardingCompletedAt) {
          throw new SetupError(
            "The business workspace is not active yet. Ask the owner to finish setup first.",
          );
        }

        const staffData = setupStaffSchema.parse({ ...data, token });

        let branchId = lockedInvitation.branchId;
        if (branchId) {
          const [branch] = await tx
            .select({ id: branches.id })
            .from(branches)
            .where(and(eq(branches.id, branchId), eq(branches.tenantId, tenant.id)))
            .limit(1);
          if (!branch) branchId = null;
        }
        if (!branchId) {
          const [fallback] = await tx
            .select({ id: branches.id })
            .from(branches)
            .where(and(eq(branches.tenantId, tenant.id), eq(branches.status, "active")))
            .orderBy(asc(branches.createdAt))
            .limit(1);
          branchId = fallback?.id ?? null;
        }
        if (!branchId) throw new SetupError("This workspace has no active branch. Ask the owner to add one.");

        const [existingMembership] = await tx
          .select({ id: tenantMemberships.id })
          .from(tenantMemberships)
          .where(
            and(
              eq(tenantMemberships.tenantId, tenant.id),
              eq(tenantMemberships.userId, userId),
            ),
          )
          .limit(1);
        if (existingMembership) throw new SetupError("You are already a member of this workspace.");

        await tx.insert(users).values({
          id: userId,
          name: staffData.name,
          email,
          phone: normalizePhone(lockedInvitation.phone),
          passwordHash,
          status: "active",
        });

        await tx.insert(tenantMemberships).values({
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          userId,
          roleKey: lockedInvitation.roleKey,
          defaultBranchId: branchId,
          status: "active",
          invitedBy: lockedInvitation.createdBy,
        });

        await tx.insert(notificationPreferences).values({
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          userId,
          lowStock: false,
          outOfStock: false,
          dailySummary: false,
          stockAdjustments: false,
          smsLowStock: false,
          smsOutOfStock: false,
          smsDailySummary: false,
          smsStockAdjustment: false,
        });

        await tx
          .update(invitations)
          .set({ status: "accepted", acceptedAt: now })
          .where(eq(invitations.id, lockedInvitation.id));
      }
    });
  } catch (error) {
    if (error instanceof SetupError) return { error: error.message };
    if (isDuplicateEntry(error)) {
      return {
        error:
          "An account with this email already exists. Sign in to Madetom, or use a different email address.",
      };
    }
    console.error("setup_failed", error);
    return {
      error: "We could not finish setup. Your changes were not saved. Please try again.",
    };
  }

  await createSession(userId);
  await writeAudit({
    tenantId: invitation.tenantId,
    actorUserId: userId,
    actorName: data.name,
    action: invitation.type === "owner" ? "org.setup_completed" : "staff.joined",
    entityType: invitation.type === "owner" ? "tenant" : "membership",
    entityId: invitation.tenantId,
    summary:
      invitation.type === "owner"
        ? "Completed business setup and activated the workspace"
        : `Joined the workspace as ${invitation.roleKey.replaceAll("_", " ")}`,
  });

  redirect(invitation.type === "owner" ? "/app?setup=complete" : "/app?joined=1");
}
