import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  subscriptionPlans,
  subscriptions,
  tenantMemberships,
  tenants,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  effectivePermissions,
  type PermissionKey,
  type RoleKey,
} from "@/lib/permissions";

export const BRANCH_COOKIE = "madetom_branch";

export type BusinessContext = {
  user: NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];
  membership: typeof tenantMemberships.$inferSelect;
  tenant: typeof tenants.$inferSelect;
  roleKey: RoleKey;
  permissions: Set<PermissionKey>;
  branches: (typeof branches.$inferSelect)[];
  activeBranch: typeof branches.$inferSelect;
  canViewAllBranches: boolean;
  subscription: typeof subscriptions.$inferSelect | null;
  plan: typeof subscriptionPlans.$inferSelect | null;
};

/** Load the authenticated user's workspace, with tenant isolation applied. */
const loadBusinessContext = cache(async (): Promise<BusinessContext> => {
  const session = await getSession();
  if (!session) redirect("/login");

  const [row] = await db
    .select({ membership: tenantMemberships, tenant: tenants })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(
      and(
        eq(tenantMemberships.userId, session.user.id),
        eq(tenantMemberships.status, "active"),
      ),
    )
    .orderBy(asc(tenantMemberships.joinedAt))
    .limit(1);

  if (!row) {
    if (session.user.isSuperAdmin) redirect("/admin");
    redirect("/login?error=no-workspace");
  }

  if (row.tenant.status === "suspended") redirect("/suspended");
  if (!row.tenant.onboardingCompletedAt) redirect("/login?error=setup-incomplete");

  const roleKey = row.membership.roleKey as RoleKey;
  const permissions = effectivePermissions(roleKey, row.membership.permissionsOverride);
  const canViewAllBranches =
    permissions.has("branches.view_all") || roleKey === "owner" || roleKey === "manager";

  const allBranches = await db
    .select()
    .from(branches)
    .where(and(eq(branches.tenantId, row.tenant.id), eq(branches.status, "active")))
    .orderBy(asc(branches.createdAt));

  if (allBranches.length === 0) {
    redirect("/login?error=no-branch");
  }

  const allowedBranches = canViewAllBranches
    ? allBranches
    : allBranches.filter(
        (branch) => branch.id === row.membership.defaultBranchId,
      );

  if (allowedBranches.length === 0) {
    // A staff member without a branch assignment falls back to the default branch.
    const fallback = allBranches.find((branch) => branch.isDefault) ?? allBranches[0];
    allowedBranches.push(fallback);
  }

  const cookieStore = await cookies();
  const requestedBranch = cookieStore.get(BRANCH_COOKIE)?.value;
  const activeBranch =
    allowedBranches.find((branch) => branch.id === requestedBranch) ??
    allowedBranches.find((branch) => branch.id === row.membership.defaultBranchId) ??
    allowedBranches.find((branch) => branch.isDefault) ??
    allowedBranches[0];

  const [subscriptionRow] = await db
    .select({ subscription: subscriptions, plan: subscriptionPlans })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.key, subscriptions.planKey))
    .where(eq(subscriptions.tenantId, row.tenant.id))
    .limit(1);

  return {
    user: session.user,
    membership: row.membership,
    tenant: row.tenant,
    roleKey,
    permissions,
    branches: allowedBranches,
    activeBranch,
    canViewAllBranches,
    subscription: subscriptionRow?.subscription ?? null,
    plan: subscriptionRow?.plan ?? null,
  };
});

export async function getBusinessContext(): Promise<BusinessContext> {
  return loadBusinessContext();
}

export async function requireBusiness(permission?: PermissionKey): Promise<BusinessContext> {
  const context = await loadBusinessContext();
  if (permission && !context.permissions.has(permission)) {
    redirect(`/app?denied=${encodeURIComponent(permission)}`);
  }
  return context;
}

export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.isSuperAdmin) redirect("/app");
  return session.user;
}
