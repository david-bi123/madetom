/**
 * Centralised subscription entitlement service for Madetom.
 *
 * This module is the single place where subscription limits, status rules and
 * feature entitlements are checked. Every enforcement point (product creation,
 * CSV import, staff invitation, branch creation, feature access, API routes)
 * reads from here so limits are consistent across the backend and frontend.
 *
 * Counting rules:
 * - Product usage counts ACTIVE products only (archived products are excluded).
 * - Staff usage counts ACTIVE tenant memberships only. Platform/Super Admin
 *   accounts are never counted as organisation staff.
 * - Pending staff invitations count towards the staff limit so the limit cannot
 *   be bypassed by creating several invitations.
 * - Branch usage counts ACTIVE branches only.
 * - Every query is scoped to the supplied tenant ID; no caller can read another
 *   organisation's usage through this service.
 */

import { and, count, eq } from "drizzle-orm";
import { db, type Database, type Transaction } from "@/lib/db";
import {
  branches,
  invitations,
  products,
  subscriptionPlans,
  subscriptions,
  tenantMemberships,
  users,
} from "@/lib/db/schema";
import {
  cheapestPlanForFeature,
  getFeatureDefinition,
  getPlanConfig,
  planHasFeature,
  PLAN_CONFIGS,
  PLAN_KEYS,
  SUBSCRIPTION_STATUS_RULES,
  type PlanConfig,
  type PlanEntitlement,
  type PlanKey,
  type SubscriptionStatus,
} from "@/lib/subscription/plans";

export type EntitlementReason =
  | "allowed"
  | "no_subscription"
  | "subscription_inactive"
  | "limit_reached"
  | "feature_not_in_plan";

export interface EntitlementCheck {
  allowed: boolean;
  reason: EntitlementReason;
  planKey: PlanKey | null;
  planName: string | null;
  used: number;
  limit: number | null; // null = unlimited
  remaining: number | null;
  message: string | null;
  upgradeTo: PlanKey | null;
  upgradeMessage: string | null;
  subscriptionStatus: SubscriptionStatus | null;
}

export interface SubscriptionRecord {
  subscription: typeof subscriptions.$inferSelect;
  plan: PlanConfig;
  status: SubscriptionStatus;
  rules: (typeof SUBSCRIPTION_STATUS_RULES)[SubscriptionStatus];
}

export interface UsageSnapshot {
  plan: PlanConfig | null;
  subscriptionStatus: SubscriptionStatus | null;
  subscription: typeof subscriptions.$inferSelect | null;
  products: { used: number; limit: number | null };
  staff: { used: number; limit: number | null; active: number; pendingInvitations: number };
  branches: { used: number; limit: number | null };
  transactions: { used: number; limit: number | null };
}

export interface OrganisationUsage extends UsageSnapshot {
  tenantId: string;
  planKey: PlanKey | null;
  planName: string;
  billingAmount: number;
  currency: string;
  renewalDate: Date | null;
  approachingLimit: boolean;
  overLimit: boolean;
}

/** Executor that can be either the pooled DB or an open transaction. */
export type DbExecutor = Database | Transaction;

/**
 * Map a DB subscriptionPlans row to the in-code PlanConfig. The DB stores price
 * as a decimal string and maxEmployees instead of maxStaff, so normalise here.
 */
export function mapDbPlanToConfig(dbPlan: {
  key: string;
  name: string;
  description: string | null;
  priceMonthly: string;
  maxEmployees: number;
  maxBranches: number;
  maxProducts: number | null;
  maxTransactionsPerMonth: number;
  smsCredits: number;
  features: PlanEntitlement[] | string | null;
  isActive: boolean;
  sortOrder: number;
}): PlanConfig {
  const fallback = PLAN_CONFIGS[dbPlan.key as PlanKey];
  if (fallback) {
    // The code configuration is the source of truth for known plans. The DB
    // row exists for joins, but must never override prices, limits or features.
    return { ...fallback, isActive: dbPlan.isActive };
  }

  let features: PlanEntitlement[] = [];
  if (Array.isArray(dbPlan.features)) {
    features = dbPlan.features;
  } else if (typeof dbPlan.features === "string") {
    try {
      const parsed = JSON.parse(dbPlan.features);
      if (Array.isArray(parsed)) features = parsed as PlanEntitlement[];
    } catch {
      features = [];
    }
  }

  return {
    key: dbPlan.key as PlanKey,
    name: dbPlan.name,
    description: dbPlan.description ?? "",
    priceMonthly: Math.round(Number(dbPlan.priceMonthly) * 100),
    currency: "GHS",
    maxProducts: dbPlan.maxProducts ?? null,
    maxStaff: dbPlan.maxEmployees,
    maxBranches: dbPlan.maxBranches,
    maxTransactionsPerMonth: dbPlan.maxTransactionsPerMonth,
    smsCredits: dbPlan.smsCredits,
    features,
    isActive: dbPlan.isActive,
    sortOrder: dbPlan.sortOrder,
  };
}

/**
 * Load an organisation's subscription record and plan.
 */
export async function getSubscriptionRecord(
  tenantId: string,
  executor: DbExecutor = db,
): Promise<SubscriptionRecord | null> {
  const [row] = await executor
    .select({ subscription: subscriptions, plan: subscriptionPlans })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.key, subscriptions.planKey))
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1);

  if (!row?.subscription) return null;
  const status = row.subscription.status as SubscriptionStatus;
  return {
    subscription: row.subscription,
    plan: mapDbPlanToConfig(row.plan as Parameters<typeof mapDbPlanToConfig>[0]),
    status,
    rules: SUBSCRIPTION_STATUS_RULES[status] ?? SUBSCRIPTION_STATUS_RULES.expired,
  };
}

/**
 * Lock an organisation's subscription row inside a transaction. Used by write
 * paths so two concurrent requests cannot both consume the last available slot.
 */
export async function lockSubscription(
  tx: DbExecutor,
  tenantId: string,
): Promise<SubscriptionRecord | null> {
  const [row] = await tx
    .select({ subscription: subscriptions, plan: subscriptionPlans })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.key, subscriptions.planKey))
    .where(eq(subscriptions.tenantId, tenantId))
    .for("update")
    .limit(1);

  if (!row?.subscription) return null;
  const status = row.subscription.status as SubscriptionStatus;
  return {
    subscription: row.subscription,
    plan: mapDbPlanToConfig(row.plan as Parameters<typeof mapDbPlanToConfig>[0]),
    status,
    rules: SUBSCRIPTION_STATUS_RULES[status] ?? SUBSCRIPTION_STATUS_RULES.expired,
  };
}

/**
 * Count active products for a tenant. Archived products are excluded.
 */
export async function countActiveProducts(
  tenantId: string,
  executor: DbExecutor = db,
): Promise<number> {
  const [row] = await executor
    .select({ value: count() })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.status, "active")));
  return Number(row?.value ?? 0);
}

/**
 * Count active staff memberships for a tenant. Super Admin platform accounts
 * are excluded. Only memberships belonging to this organisation count.
 */
export async function countActiveStaff(
  tenantId: string,
  executor: DbExecutor = db,
): Promise<number> {
  const [row] = await executor
    .select({ value: count() })
    .from(tenantMemberships)
    .innerJoin(users, eq(users.id, tenantMemberships.userId))
    .where(
      and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.status, "active"),
        eq(users.isSuperAdmin, false),
      ),
    );
  return Number(row?.value ?? 0);
}

/**
 * Count pending staff invitations for a tenant. These count towards the staff
 * limit to prevent bypassing it with multiple invitations.
 */
export async function countPendingInvitations(
  tenantId: string,
  executor: DbExecutor = db,
): Promise<number> {
  const [row] = await executor
    .select({ value: count() })
    .from(invitations)
    .where(
      and(
        eq(invitations.tenantId, tenantId),
        eq(invitations.type, "staff"),
        eq(invitations.status, "pending"),
      ),
    );
  return Number(row?.value ?? 0);
}

/**
 * Count active branches for a tenant.
 */
export async function countActiveBranches(
  tenantId: string,
  executor: DbExecutor = db,
): Promise<number> {
  const [row] = await executor
    .select({ value: count() })
    .from(branches)
    .where(and(eq(branches.tenantId, tenantId), eq(branches.status, "active")));
  return Number(row?.value ?? 0);
}

/**
 * Get a full usage snapshot for an organisation.
 */
export async function getUsageSnapshot(tenantId: string): Promise<UsageSnapshot> {
  const [record, productsUsed, staffActive, pendingInvitations, branchesUsed] = await Promise.all([
    getSubscriptionRecord(tenantId),
    countActiveProducts(tenantId),
    countActiveStaff(tenantId),
    countPendingInvitations(tenantId),
    countActiveBranches(tenantId),
  ]);

  const plan = record?.plan ?? null;
  return {
    plan,
    subscription: record?.subscription ?? null,
    subscriptionStatus: record?.status ?? null,
    products: { used: productsUsed, limit: plan?.maxProducts ?? null },
    staff: {
      used: staffActive + pendingInvitations,
      limit: plan?.maxStaff ?? null,
      active: staffActive,
      pendingInvitations,
    },
    branches: { used: branchesUsed, limit: plan?.maxBranches ?? null },
    // Transactions are tracked for information; the POS is never blocked by
    // this counter on any plan because it is essential functionality.
    transactions: { used: 0, limit: plan?.maxTransactionsPerMonth ?? null },
  };
}

/**
 * Get usage for a Super Admin view, including billing and limit warnings.
 */
export async function getOrganisationUsage(tenantId: string): Promise<OrganisationUsage> {
  const snapshot = await getUsageSnapshot(tenantId);
  const subscription = snapshot.subscription;
  const plan = snapshot.plan;

  const ratios = [snapshot.products, snapshot.staff, snapshot.branches]
    .filter((item) => item.limit !== null && item.limit > 0)
    .map((item) => item.used / (item.limit as number));

  return {
    ...snapshot,
    tenantId,
    planKey: plan?.key ?? null,
    planName: plan?.name ?? "No plan",
    billingAmount: subscription ? Number(subscription.billingAmount) : 0,
    currency: subscription?.currency ?? "GHS",
    renewalDate: subscription?.currentPeriodEnd ?? null,
    approachingLimit: ratios.some((ratio) => ratio >= 0.8),
    overLimit: ratios.some((ratio) => ratio >= 1),
  };
}

/**
 * Subscription access rules. A suspended/expired/cancelled subscription keeps
 * read access to records but pauses writes. A past-due subscription keeps
 * working access with a billing warning.
 */
export async function getSubscriptionAccess(tenantId: string): Promise<{
  writable: boolean;
  featureAccess: boolean;
  status: SubscriptionStatus | null;
  message: string;
  planName: string | null;
}> {
  const record = await getSubscriptionRecord(tenantId);
  if (!record) {
    return {
      writable: false,
      featureAccess: false,
      status: null,
      message: "No subscription is assigned to this organisation. Contact your administrator.",
      planName: null,
    };
  }
  return {
    writable: record.rules.writable,
    featureAccess: record.rules.featureAccess,
    status: record.status,
    message: record.rules.message,
    planName: record.plan.name,
  };
}

function upgradePath(currentKey: PlanKey): PlanKey | null {
  const idx = PLAN_KEYS.indexOf(currentKey);
  if (idx < 0 || idx >= PLAN_KEYS.length - 1) return null;
  return PLAN_KEYS[idx + 1];
}

function limitCheck(input: {
  record: SubscriptionRecord | null;
  resource: "product" | "staff" | "branch";
  used: number;
  limit: number | null;
  additional: number;
  label: string;
  upgradeNoun: string;
}): EntitlementCheck {
  const { record, used, limit, additional } = input;

  if (!record) {
    return {
      allowed: false,
      reason: "no_subscription",
      planKey: null,
      planName: null,
      used,
      limit: null,
      remaining: null,
      message: "No active subscription. Contact your administrator to assign a plan.",
      upgradeTo: "starter",
      upgradeMessage: "Ask the platform administrator to assign a Starter plan.",
      subscriptionStatus: null,
    };
  }

  if (!record.rules.writable) {
    return {
      allowed: false,
      reason: "subscription_inactive",
      planKey: record.plan.key,
      planName: record.plan.name,
      used,
      limit,
      remaining: limit === null ? null : Math.max(0, limit - used),
      message: record.rules.message,
      upgradeTo: null,
      upgradeMessage: "Resolve billing with the platform administrator to resume changes.",
      subscriptionStatus: record.status,
    };
  }

  if (limit !== null && used + additional > limit) {
    const next = upgradePath(record.plan.key);
    return {
      allowed: false,
      reason: "limit_reached",
      planKey: record.plan.key,
      planName: record.plan.name,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      message: `You have reached your ${record.plan.name} plan ${input.label} limit of ${limit.toLocaleString()} ${input.upgradeNoun}.`,
      upgradeTo: next,
      upgradeMessage: next
        ? `Upgrade to ${getPlanConfig(next).name} to ${input.resource === "product" ? "manage up to" : "add up to"} ${
            input.resource === "product"
              ? getPlanConfig(next).maxProducts?.toLocaleString() ?? "unlimited"
              : input.resource === "staff"
                ? getPlanConfig(next).maxStaff
                : getPlanConfig(next).maxBranches
          } ${input.upgradeNoun}.`
        : "You are on the highest plan. Contact support for a custom arrangement.",
      subscriptionStatus: record.status,
    };
  }

  return {
    allowed: true,
    reason: "allowed",
    planKey: record.plan.key,
    planName: record.plan.name,
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    message: null,
    upgradeTo: null,
    upgradeMessage: null,
    subscriptionStatus: record.status,
  };
}

/**
 * Check whether products can be created. Pass a transaction to make the check
 * and the subsequent insert atomic. `additional` lets bulk imports reserve
 * several slots at once.
 */
export async function assertProductCapacity(
  executor: DbExecutor,
  tenantId: string,
  additional = 1,
): Promise<EntitlementCheck> {
  const record = executor === db ? await getSubscriptionRecord(tenantId) : await lockSubscription(executor, tenantId);
  const used = await countActiveProducts(tenantId, executor);
  return limitCheck({
    record,
    resource: "product",
    used,
    limit: record?.plan.maxProducts ?? null,
    additional,
    label: "product",
    upgradeNoun: "products",
  });
}

/**
 * Check whether a staff member can be invited. Counts active staff plus pending
 * invitations towards the limit.
 */
export async function assertStaffCapacity(
  executor: DbExecutor,
  tenantId: string,
  additional = 1,
): Promise<EntitlementCheck> {
  const record = executor === db ? await getSubscriptionRecord(tenantId) : await lockSubscription(executor, tenantId);
  const [active, pending] = await Promise.all([
    countActiveStaff(tenantId, executor),
    countPendingInvitations(tenantId, executor),
  ]);
  return limitCheck({
    record,
    resource: "staff",
    used: active + pending,
    limit: record?.plan.maxStaff ?? null,
    additional,
    label: "staff",
    upgradeNoun: "staff accounts",
  });
}

/**
 * Check whether a new branch can be created.
 */
export async function assertBranchCapacity(
  executor: DbExecutor,
  tenantId: string,
  additional = 1,
): Promise<EntitlementCheck> {
  const record = executor === db ? await getSubscriptionRecord(tenantId) : await lockSubscription(executor, tenantId);
  const used = await countActiveBranches(tenantId, executor);
  return limitCheck({
    record,
    resource: "branch",
    used,
    limit: record?.plan.maxBranches ?? null,
    additional,
    label: "branch",
    upgradeNoun: "branches",
  });
}

export async function canCreateProduct(
  tenantId: string,
  additional = 1,
): Promise<EntitlementCheck> {
  return assertProductCapacity(db, tenantId, additional);
}

export async function canInviteStaff(tenantId: string): Promise<EntitlementCheck> {
  return assertStaffCapacity(db, tenantId, 1);
}

export async function canCreateBranch(tenantId: string): Promise<EntitlementCheck> {
  return assertBranchCapacity(db, tenantId, 1);
}

/**
 * Check whether an organisation has a specific feature entitlement. Also
 * respects subscription status: suspended/expired/cancelled organisations do
 * not get feature access even if the plan includes it.
 */
export async function hasFeature(
  tenantId: string,
  featureKey: string,
): Promise<{
  allowed: boolean;
  planKey: PlanKey | null;
  planName: string | null;
  requiredPlan: PlanKey | null;
  message: string | null;
  upgradeMessage: string | null;
  subscriptionStatus: SubscriptionStatus | null;
}> {
  const record = await getSubscriptionRecord(tenantId);

  if (!record) {
    return {
      allowed: false,
      planKey: null,
      planName: null,
      requiredPlan: cheapestPlanForFeature(featureKey),
      message: "No active subscription. Contact your administrator.",
      upgradeMessage: "Ask the platform administrator to assign a plan.",
      subscriptionStatus: null,
    };
  }

  if (!record.rules.featureAccess) {
    return {
      allowed: false,
      planKey: record.plan.key,
      planName: record.plan.name,
      requiredPlan: null,
      message: record.rules.message,
      upgradeMessage: "Resolve billing with the platform administrator to restore access.",
      subscriptionStatus: record.status,
    };
  }

  const included =
    record.plan.features.some((feature) => feature.key === featureKey) ||
    planHasFeature(record.plan.key, featureKey);

  if (included) {
    return {
      allowed: true,
      planKey: record.plan.key,
      planName: record.plan.name,
      requiredPlan: null,
      message: null,
      upgradeMessage: null,
      subscriptionStatus: record.status,
    };
  }

  const requiredPlan = cheapestPlanForFeature(featureKey);
  const definition = getFeatureDefinition(featureKey);
  return {
    allowed: false,
    planKey: record.plan.key,
    planName: record.plan.name,
    requiredPlan,
    message: definition
      ? `${definition.label} is not included in the ${record.plan.name} plan.`
      : "This feature is not included in your current plan.",
    upgradeMessage: requiredPlan
      ? `Upgrade to ${getPlanConfig(requiredPlan).name} (GH₵${(
          getPlanConfig(requiredPlan).priceMonthly / 100
        ).toFixed(2)}/month) to unlock it.`
      : "Contact support to discuss a custom arrangement.",
    subscriptionStatus: record.status,
  };
}

/**
 * Throwable error used by API routes and server actions to return structured
 * entitlement failures without leaking implementation details.
 */
export class EntitlementError extends Error {
  readonly code: EntitlementReason;
  readonly featureKey: string | null;
  readonly requiredPlan: PlanKey | null;
  readonly upgradeMessage: string | null;
  readonly statusCode: number;

  constructor(input: {
    message: string;
    code: EntitlementReason;
    featureKey?: string | null;
    requiredPlan?: PlanKey | null;
    upgradeMessage?: string | null;
    statusCode?: number;
  }) {
    super(input.message);
    this.name = "EntitlementError";
    this.code = input.code;
    this.featureKey = input.featureKey ?? null;
    this.requiredPlan = input.requiredPlan ?? null;
    this.upgradeMessage = input.upgradeMessage ?? null;
    this.statusCode = input.statusCode ?? 403;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      feature: this.featureKey,
      requiredPlan: this.requiredPlan,
      upgradeMessage: this.upgradeMessage,
    };
  }
}

/**
 * Server-side feature guard for API routes. Throws EntitlementError when the
 * organisation cannot use the feature.
 */
export async function requireFeature(tenantId: string, featureKey: string): Promise<void> {
  const result = await hasFeature(tenantId, featureKey);
  if (!result.allowed) {
    throw new EntitlementError({
      message: result.message ?? "This feature is not available on your plan.",
      code: result.subscriptionStatus && !result.requiredPlan ? "subscription_inactive" : "feature_not_in_plan",
      featureKey,
      requiredPlan: result.requiredPlan,
      upgradeMessage: result.upgradeMessage,
      statusCode: result.subscriptionStatus && !result.requiredPlan ? 402 : 403,
    });
  }
}

/**
 * Get all plan configs sorted by sort order.
 */
export function getAllPlans(): PlanConfig[] {
  return [...PLAN_KEYS]
    .map((key) => getPlanConfig(key))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Check whether a plan key is valid.
 */
export function isValidPlanKey(key: string): key is PlanKey {
  return PLAN_KEYS.includes(key as PlanKey);
}
