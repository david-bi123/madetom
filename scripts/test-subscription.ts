/**
 * Subscription, entitlement and payment verification tests.
 *
 * Run with: npm run test:subscription
 *
 * The script uses throwaway tenants/plans and removes them at the end, so it is
 * safe to run against a development database. It never calls Paystack itself;
 * payment activation is exercised through applySuccessfulPayment(), the same
 * function used by the verified callback and webhook.
 */

import { loadEnvConfig } from "@next/env";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  auditLogs,
  branches,
  invitations,
  products,
  roles,
  smsTransactions,
  smsWallets,
  subscriptionHistory,
  subscriptionPayments,
  subscriptionPlans,
  subscriptions,
  tenantMemberships,
  tenants,
  users,
} from "../src/lib/db/schema";
import {
  assertBranchCapacity,
  assertProductCapacity,
  assertStaffCapacity,
  countActiveBranches,
  countActiveProducts,
  countActiveStaff,
  countPendingInvitations,
  getOrganisationUsage,
  getSubscriptionAccess,
  getSubscriptionRecord,
  getUsageSnapshot,
  hasFeature,
} from "../src/lib/subscription/entitlements";
import {
  applySuccessfulPayment,
  createPendingPayment,
} from "../src/lib/subscription/payments";
import {
  cheapestPlanForFeature,
  PLAN_CONFIGS,
  PLAN_KEYS,
  SUBSCRIPTION_STATUS_RULES,
} from "../src/lib/subscription/plans";
import { effectivePermissions, ROLE_CATALOG } from "../src/lib/permissions";
loadEnvConfig(process.cwd());

/* -------------------------------------------------------------------------- */
/* Assertion harness                                                           */
/* -------------------------------------------------------------------------- */

let checks = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail?: unknown): void {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.error(`  FAIL  ${label}`, detail === undefined ? "" : detail);
  }
}

function checkEqual<T>(label: string, actual: T, expected: T): void {
  check(`${label} (expected ${String(expected)}, got ${String(actual)})`, Object.is(actual, expected));
}

function section(title: string): void {
  console.log(`\n${title}`);
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const TEST_PLAN_KEY = `test_tiny_${run}`.slice(0, 40);
const now = new Date();
const in30Days = new Date(now.getTime() + 30 * 86400000);

const tenantA = crypto.randomUUID();
const tenantB = crypto.randomUUID();
const tenantC = crypto.randomUUID();
const userA = crypto.randomUUID();
const userB = crypto.randomUUID();
const userC = crypto.randomUUID();
const superAdminUser = crypto.randomUUID();

const tenantIds = [tenantA, tenantB, tenantC];
const userIds = [userA, userB, userC, superAdminUser];

async function createTenant(input: {
  tenantId: string;
  userId: string;
  name: string;
  slug: string;
  tenantStatus: "pending" | "active" | "suspended";
  planKey: string;
  status: "trial" | "active" | "pending_payment" | "past_due" | "suspended" | "expired" | "cancelled";
  currentPeriodEnd?: Date | null;
}): Promise<void> {
  await db.insert(tenants).values({
    id: input.tenantId,
    name: input.name,
    slug: input.slug,
    businessType: "Retail",
    status: input.tenantStatus,
  });
  await db.insert(users).values({
    id: input.userId,
    name: `${input.name} Owner`,
    email: `${input.slug}@example.test`,
    status: "active",
    isSuperAdmin: false,
  });
  await db.insert(tenantMemberships).values({
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    userId: input.userId,
    roleKey: "owner",
    status: "active",
  });
  await db.insert(subscriptions).values({
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    planKey: input.planKey,
    status: input.status,
    billingAmount: "0.00",
    currency: "GHS",
    currentPeriodStart: now,
    currentPeriodEnd: input.currentPeriodEnd === undefined ? in30Days : input.currentPeriodEnd,
  });
}

async function addProducts(tenantId: string, count: number, status: "active" | "archived"): Promise<void> {
  if (count === 0) return;
  await db.insert(products).values(
    Array.from({ length: count }, (_, index) => ({
      id: crypto.randomUUID(),
      tenantId,
      name: `Product ${status} ${index + 1}`,
      sku: `SKU-${status}-${index + 1}-${run}`.slice(0, 64),
      status,
    })),
  );
}

async function addBranch(tenantId: string, status: "active" | "archived", code: string): Promise<void> {
  await db.insert(branches).values({
    id: crypto.randomUUID(),
    tenantId,
    name: `Branch ${code}`,
    code,
    status,
  });
}

async function setPlan(tenantId: string, planKey: string): Promise<void> {
  await db.update(subscriptions).set({ planKey }).where(eq(subscriptions.tenantId, tenantId));
}

async function setStatus(
  tenantId: string,
  status: "trial" | "active" | "pending_payment" | "past_due" | "suspended" | "expired" | "cancelled",
): Promise<void> {
  await db.update(subscriptions).set({ status }).where(eq(subscriptions.tenantId, tenantId));
}

async function cleanup(): Promise<void> {
  try {
    await db.delete(auditLogs).where(inArray(auditLogs.tenantId, tenantIds));
    await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    await db.delete(users).where(inArray(users.id, userIds));
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.key, TEST_PLAN_KEY));
  } catch (error) {
    console.error("cleanup_failed", error);
  }
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                       */
/* -------------------------------------------------------------------------- */

async function runTests(): Promise<void> {
  section("Plan configuration");

  checkEqual("three plans are configured", PLAN_KEYS.length, 3);
  checkEqual("starter monthly price", PLAN_CONFIGS.starter.priceMonthly, 50000);
  checkEqual("growth monthly price", PLAN_CONFIGS.growth.priceMonthly, 75000);
  checkEqual("business monthly price", PLAN_CONFIGS.business.priceMonthly, 100000);
  checkEqual("starter product limit", PLAN_CONFIGS.starter.maxProducts, 1000);
  checkEqual("growth product limit", PLAN_CONFIGS.growth.maxProducts, 5000);
  checkEqual("business product limit is unlimited", PLAN_CONFIGS.business.maxProducts, null);
  checkEqual("starter staff limit", PLAN_CONFIGS.starter.maxStaff, 5);
  checkEqual("growth staff limit", PLAN_CONFIGS.growth.maxStaff, 20);
  checkEqual("business staff limit", PLAN_CONFIGS.business.maxStaff, 50);
  checkEqual("starter branch limit", PLAN_CONFIGS.starter.maxBranches, 1);
  checkEqual("growth branch limit", PLAN_CONFIGS.growth.maxBranches, 3);
  checkEqual("business branch limit", PLAN_CONFIGS.business.maxBranches, 5);
  checkEqual("starter is the cheapest POS plan", cheapestPlanForFeature("pos.use"), "starter");
  checkEqual("profit reporting requires growth", cheapestPlanForFeature("reports.profit"), "growth");
  checkEqual("stock transfer requires business", cheapestPlanForFeature("inventory.transfer"), "business");

  check("active subscriptions are writable", SUBSCRIPTION_STATUS_RULES.active.writable);
  check("active subscriptions get feature access", SUBSCRIPTION_STATUS_RULES.active.featureAccess);
  check("past-due subscriptions stay writable", SUBSCRIPTION_STATUS_RULES.past_due.writable);
  check("past-due subscriptions keep feature access", SUBSCRIPTION_STATUS_RULES.past_due.featureAccess);
  check("pending payment is read-only", !SUBSCRIPTION_STATUS_RULES.pending_payment.writable);
  check("pending payment has no feature access", !SUBSCRIPTION_STATUS_RULES.pending_payment.featureAccess);
  check("suspended is read-only", !SUBSCRIPTION_STATUS_RULES.suspended.writable);
  check("expired is read-only", !SUBSCRIPTION_STATUS_RULES.expired.writable);
  check("cancelled is read-only", !SUBSCRIPTION_STATUS_RULES.cancelled.writable);

  section("Role permissions");

  const ownerPermissions = effectivePermissions("owner");
  check("owner can sell", ownerPermissions.has("pos.use"));
  check("owner can manage the subscription", ownerPermissions.has("subscription.view"));
  check("owner can manage staff", ownerPermissions.has("staff.manage"));

  const managerPermissions = effectivePermissions("manager");
  check("manager can adjust stock", managerPermissions.has("inventory.adjust"));
  check("manager cannot manage the subscription", !managerPermissions.has("subscription.view"));
  check("manager cannot manage staff", !managerPermissions.has("staff.manage"));

  const cashierPermissions = effectivePermissions("cashier");
  check("cashier can sell", cashierPermissions.has("pos.use"));
  check("cashier cannot view financial reports", !cashierPermissions.has("reports.view"));
  check("cashier cannot manage the subscription", !cashierPermissions.has("subscription.view"));

  const grantedPermissions = effectivePermissions("cashier", { grant: ["reports.view"] });
  check("explicit grants add permissions", grantedPermissions.has("reports.view"));
  const revokedPermissions = effectivePermissions("cashier", { revoke: ["pos.use"] });
  check("explicit revokes remove permissions", !revokedPermissions.has("pos.use"));

  section("Fixtures");

  // Roles are normally created by the seed script. Ensure the canonical roles
  // used by these fixtures exist so the test is independent of seed state.
  for (const roleKey of ["owner", "cashier"] as const) {
    const role = ROLE_CATALOG[roleKey];
    await db
      .insert(roles)
      .values({ key: roleKey, name: role.name, description: role.description })
      .onDuplicateKeyUpdate({ set: { name: role.name } });
  }

  // Test-only plan with small limits so capacity checks stay fast.
  await db
    .insert(subscriptionPlans)
    .values({
      key: TEST_PLAN_KEY,
      name: "Test Tiny",
      description: "Isolated plan used by subscription tests.",
      priceMonthly: "1.00",
      priceYearly: "12.00",
      currency: "GHS",
      maxEmployees: 1,
      maxBranches: 1,
      maxProducts: 2,
      maxTransactionsPerMonth: 100,
      smsCredits: 0,
      features: [
        { key: "pos.use", label: "Point of sale", group: "Selling", description: "Test entitlement." },
      ],
      isActive: true,
      sortOrder: 99,
    })
    .onDuplicateKeyUpdate({ set: { name: "Test Tiny" } });

  await createTenant({
    tenantId: tenantA,
    userId: userA,
    name: "Test Tenant A",
    slug: `test-a-${run}`.slice(0, 80),
    tenantStatus: "active",
    planKey: TEST_PLAN_KEY,
    status: "active",
  });
  await createTenant({
    tenantId: tenantB,
    userId: userB,
    name: "Test Tenant B",
    slug: `test-b-${run}`.slice(0, 80),
    tenantStatus: "active",
    planKey: "starter",
    status: "active",
  });
  await createTenant({
    tenantId: tenantC,
    userId: userC,
    name: "Test Tenant C",
    slug: `test-c-${run}`.slice(0, 80),
    tenantStatus: "pending",
    planKey: "starter",
    status: "pending_payment",
    // A self-serve signup has no paid period until the first verified payment.
    currentPeriodEnd: null,
  });

  await db.insert(smsWallets).values({
    id: crypto.randomUUID(),
    tenantId: tenantC,
    credits: 0,
  });

  await addProducts(tenantA, 2, "active");
  await addProducts(tenantA, 1, "archived");
  await addBranch(tenantA, "active", "MAIN");
  await addBranch(tenantA, "archived", "OLD");
  check("fixtures created", true);

  section("Product, staff and branch limits");

  checkEqual("archived products are excluded from usage", await countActiveProducts(tenantA), 2);
  const productAtLimit = await assertProductCapacity(db, tenantA, 1);
  check("creating past the product limit is blocked", !productAtLimit.allowed, productAtLimit);
  checkEqual("product limit reason", productAtLimit.reason, "limit_reached");
  checkEqual("product usage reported", productAtLimit.used, 2);
  checkEqual("product limit reported", productAtLimit.limit, 2);
  check("creating within the product limit is allowed", (await assertProductCapacity(db, tenantA, 0)).allowed);

  checkEqual("active staff counted", await countActiveStaff(tenantA), 1);
  await db.insert(users).values({
    id: superAdminUser,
    name: "Platform Admin",
    email: `super-${run}@example.test`,
    status: "active",
    isSuperAdmin: true,
  });
  await db.insert(tenantMemberships).values({
    id: crypto.randomUUID(),
    tenantId: tenantA,
    userId: superAdminUser,
    roleKey: "owner",
    status: "active",
  });
  checkEqual("super admin memberships are not counted as staff", await countActiveStaff(tenantA), 1);
  check("staff within the limit is allowed", (await assertStaffCapacity(db, tenantA, 0)).allowed);
  check("inviting past the staff limit is blocked", !(await assertStaffCapacity(db, tenantA, 1)).allowed);

  await db.insert(invitations).values({
    id: crypto.randomUUID(),
    tenantId: tenantA,
    type: "staff",
    name: "Pending Person",
    email: `pending-${run}@example.test`,
    phone: "+233200000000",
    roleKey: "cashier",
    tokenHash: `token-${run}`.slice(0, 64),
    status: "pending",
    expiresAt: in30Days,
  });
  checkEqual("pending invitations counted", await countPendingInvitations(tenantA), 1);
  checkEqual("active staff unchanged by invitation", await countActiveStaff(tenantA), 1);
  check("pending invitations consume the staff limit", !(await assertStaffCapacity(db, tenantA, 0)).allowed);

  checkEqual("archived branches are excluded from usage", await countActiveBranches(tenantA), 1);
  check("creating past the branch limit is blocked", !(await assertBranchCapacity(db, tenantA, 1)).allowed);

  check("starter blocks a 1001-product bulk import", !(await assertProductCapacity(db, tenantB, 1001)).allowed);
  const bulkCheck = await assertProductCapacity(db, tenantB, 1001);
  checkEqual("bulk import points to the next plan", bulkCheck.upgradeTo, "growth");
  check("starter allows one branch when empty", (await assertBranchCapacity(db, tenantB, 1)).allowed);
  await addBranch(tenantB, "active", "B1");
  check("starter blocks a second branch", !(await assertBranchCapacity(db, tenantB, 1)).allowed);
  check("starter allows another staff member", (await assertStaffCapacity(db, tenantB, 1)).allowed);

  section("Feature entitlements");

  const starterProfit = await hasFeature(tenantB, "reports.profit");
  check("starter cannot use profit reporting", !starterProfit.allowed);
  checkEqual("profit reporting requires growth", starterProfit.requiredPlan, "growth");
  check("starter can use point of sale", (await hasFeature(tenantB, "pos.use")).allowed);

  await setPlan(tenantB, "growth");
  check("growth can use profit reporting", (await hasFeature(tenantB, "reports.profit")).allowed);
  const growthTransfer = await hasFeature(tenantB, "inventory.transfer");
  check("growth cannot use stock transfers", !growthTransfer.allowed);
  checkEqual("stock transfers require business", growthTransfer.requiredPlan, "business");

  await setPlan(tenantB, "business");
  check("business can use stock transfers", (await hasFeature(tenantB, "inventory.transfer")).allowed);
  check("business keeps profit reporting", (await hasFeature(tenantB, "reports.profit")).allowed);

  section("Downgrades preserve data and block new records");

  await setPlan(tenantB, "starter");
  await addProducts(tenantB, 3, "active");
  await setPlan(tenantB, TEST_PLAN_KEY);

  const downgradedUsage = await getOrganisationUsage(tenantB);
  checkEqual("products are not deleted on downgrade", downgradedUsage.products.used, 3);
  checkEqual("downgraded limit is reported", downgradedUsage.products.limit, 2);
  check("over-limit usage is flagged", downgradedUsage.overLimit);
  const downgradedCreate = await assertProductCapacity(db, tenantB, 1);
  check("new products are blocked while over the limit", !downgradedCreate.allowed);
  checkEqual("over-limit reason", downgradedCreate.reason, "limit_reached");
  checkEqual("existing products still counted after downgrade", await countActiveProducts(tenantB), 3);

  section("Subscription status rules");

  const activeAccess = await getSubscriptionAccess(tenantA);
  check("active subscription is writable", activeAccess.writable);
  check("active subscription has feature access", activeAccess.featureAccess);

  for (const status of ["pending_payment", "suspended", "expired", "cancelled"] as const) {
    await setStatus(tenantA, status);
    const access = await getSubscriptionAccess(tenantA);
    check(`${status} is read-only`, !access.writable);
    check(`${status} has no feature access`, !access.featureAccess);
    check(`${status} blocks feature checks`, !(await hasFeature(tenantA, "pos.use")).allowed);
  }

  await setStatus(tenantA, "past_due");
  const pastDueAccess = await getSubscriptionAccess(tenantA);
  check("past due remains writable", pastDueAccess.writable);
  check("past due keeps feature access", pastDueAccess.featureAccess);
  const pastDueCapacity = await assertProductCapacity(db, tenantA, 1);
  checkEqual("past due is blocked by limits, not billing", pastDueCapacity.reason, "limit_reached");

  await setStatus(tenantA, "suspended");
  const suspendedCapacity = await assertProductCapacity(db, tenantA, 1);
  check("suspended subscriptions cannot create products", !suspendedCapacity.allowed);
  checkEqual("suspended capacity reason", suspendedCapacity.reason, "subscription_inactive");
  checkEqual("suspended subscription data remains readable", await countActiveProducts(tenantA), 2);

  await setStatus(tenantA, "active");

  section("Paystack payment verification and idempotency");

  const pendingAccess = await getSubscriptionAccess(tenantC);
  check("pending-payment workspace is read-only", !pendingAccess.writable);
  const pendingCapacity = await assertProductCapacity(db, tenantC, 1);
  checkEqual("pending-payment workspace cannot create products", pendingCapacity.reason, "subscription_inactive");

  const failedReference = `test-failed-${run}`;
  await createPendingPayment({
    tenantId: tenantC,
    planKey: "starter",
    reference: failedReference,
    amountPesewas: PLAN_CONFIGS.starter.priceMonthly,
    currency: "GHS",
  });
  const wrongAmount = await applySuccessfulPayment({
    reference: failedReference,
    amountPesewas: PLAN_CONFIGS.starter.priceMonthly - 100,
    currency: "GHS",
  });
  check("amount mismatch is rejected", !wrongAmount.ok);
  const [failedPayment] = await db
    .select()
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.reference, failedReference));
  checkEqual("mismatched payment marked failed", failedPayment.status, "failed");
  check("mismatched payment does not activate the tenant", (await db.select().from(tenants).where(eq(tenants.id, tenantC)))[0].status === "pending");
  check("mismatched payment keeps the workspace read-only", !(await getSubscriptionAccess(tenantC)).writable);

  const reference = `test-success-${run}`;
  await createPendingPayment({
    tenantId: tenantC,
    planKey: "starter",
    reference,
    amountPesewas: PLAN_CONFIGS.starter.priceMonthly,
    currency: "GHS",
  });
  const applied = await applySuccessfulPayment({
    reference,
    amountPesewas: PLAN_CONFIGS.starter.priceMonthly,
    currency: "GHS",
    providerReference: `paystack-${run}`,
    paidAt: now,
  });
  check("verified payment activates the workspace", applied.ok, applied);
  checkEqual("activation returns the plan", applied.planKey, "starter");

  const [activatedTenant] = await db.select().from(tenants).where(eq(tenants.id, tenantC));
  checkEqual("tenant becomes active after payment", activatedTenant.status, "active");

  const activatedRecord = await getSubscriptionRecord(tenantC);
  check("subscription exists after payment", activatedRecord !== null);
  checkEqual("subscription becomes active", activatedRecord?.status, "active");
  checkEqual("subscription plan set", activatedRecord?.subscription.planKey, "starter");
  checkEqual("billing amount recorded", activatedRecord?.subscription.billingAmount, "500.00");
  checkEqual("billing currency recorded", activatedRecord?.subscription.currency, "GHS");
  check(
    "period end is roughly one month out",
    activatedRecord?.subscription.currentPeriodEnd instanceof Date &&
      Math.abs(activatedRecord.subscription.currentPeriodEnd.getTime() - in30Days.getTime()) < 60000,
    activatedRecord?.subscription.currentPeriodEnd,
  );

  const [wallet] = await db.select().from(smsWallets).where(eq(smsWallets.tenantId, tenantC));
  checkEqual("included SMS credits granted once", wallet.credits, PLAN_CONFIGS.starter.smsCredits);
  const [smsCount] = await db
    .select({ value: count() })
    .from(smsTransactions)
    .where(eq(smsTransactions.tenantId, tenantC));
  checkEqual("SMS credit transaction recorded", Number(smsCount.value), 1);

  const [historyCount] = await db
    .select({ value: count() })
    .from(subscriptionHistory)
    .where(eq(subscriptionHistory.tenantId, tenantC));
  checkEqual("activation history recorded", Number(historyCount.value), 1);
  const [activationHistory] = await db
    .select()
    .from(subscriptionHistory)
    .where(eq(subscriptionHistory.tenantId, tenantC));
  checkEqual("history action is activation", activationHistory.action, "activated");

  const duplicate = await applySuccessfulPayment({
    reference,
    amountPesewas: PLAN_CONFIGS.starter.priceMonthly,
    currency: "GHS",
  });
  check("duplicate verification reports already processed", duplicate.alreadyProcessed === true, duplicate);

  const [walletAfterDuplicate] = await db.select().from(smsWallets).where(eq(smsWallets.tenantId, tenantC));
  checkEqual("duplicate does not grant SMS credits twice", walletAfterDuplicate.credits, PLAN_CONFIGS.starter.smsCredits);
  const [historyAfterDuplicate] = await db
    .select({ value: count() })
    .from(subscriptionHistory)
    .where(eq(subscriptionHistory.tenantId, tenantC));
  checkEqual("duplicate does not duplicate history", Number(historyAfterDuplicate.value), 1);
  const [smsAfterDuplicate] = await db
    .select({ value: count() })
    .from(smsTransactions)
    .where(eq(smsTransactions.tenantId, tenantC));
  checkEqual("duplicate does not duplicate SMS transactions", Number(smsAfterDuplicate.value), 1);

  const [auditCount] = await db
    .select({ value: count() })
    .from(auditLogs)
    .where(and(eq(auditLogs.tenantId, tenantC), eq(auditLogs.action, "subscription.payment_received")));
  checkEqual("verified payment is audited once", Number(auditCount.value), 1);

  check("activated workspace becomes writable", (await getSubscriptionAccess(tenantC)).writable);
  check("activated workspace can create products", (await assertProductCapacity(db, tenantC, 1)).allowed);

  const currencyReference = `test-currency-${run}`;
  await createPendingPayment({
    tenantId: tenantC,
    planKey: "growth",
    reference: currencyReference,
    amountPesewas: PLAN_CONFIGS.growth.priceMonthly,
    currency: "GHS",
  });
  const wrongCurrency = await applySuccessfulPayment({
    reference: currencyReference,
    amountPesewas: PLAN_CONFIGS.growth.priceMonthly,
    currency: "USD",
  });
  check("currency mismatch is rejected", !wrongCurrency.ok);
  const [currencyPayment] = await db
    .select()
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.reference, currencyReference));
  checkEqual("mismatched currency marked failed", currencyPayment.status, "failed");

  const unknown = await applySuccessfulPayment({
    reference: `unknown-${run}`,
    amountPesewas: 100,
    currency: "GHS",
  });
  check("unknown reference is rejected", !unknown.ok);

  section("Cross-tenant isolation");

  checkEqual("tenant A usage stays scoped", await countActiveProducts(tenantA), 2);
  checkEqual("tenant B usage stays scoped", await countActiveProducts(tenantB), 3);
  checkEqual("tenant C usage stays scoped", await countActiveProducts(tenantC), 0);
  checkEqual("tenant A staff stays scoped", await countActiveStaff(tenantA), 1);
  checkEqual("tenant C staff stays scoped", await countActiveStaff(tenantC), 1);

  await setStatus(tenantB, "suspended");
  check("suspending one tenant does not affect another", (await getSubscriptionAccess(tenantA)).writable);
  check("suspended tenant remains read-only", !(await getSubscriptionAccess(tenantB)).writable);
  await setStatus(tenantB, "active");

  const usageA = await getUsageSnapshot(tenantA);
  const usageB = await getUsageSnapshot(tenantB);
  check("usage snapshots are per tenant", usageA.products.used !== usageB.products.used);
  checkEqual("plan key is per tenant", usageA.plan?.key, TEST_PLAN_KEY);
  checkEqual("other tenant keeps its plan", usageB.plan?.key, TEST_PLAN_KEY);
  check("tenant plans are independent", usageA.staff.used !== usageB.staff.used || usageA.products.used !== usageB.products.used);
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

runTests()
  .catch((error) => {
    failures.push("unhandled error");
    console.error(error);
  })
  .finally(async () => {
    await cleanup();

    console.log(`\n${checks - failures.length}/${checks} checks passed`);
    if (failures.length) {
      console.error(`\n${failures.length} failed:`);
      for (const failure of failures) console.error(` - ${failure}`);
    }

    const pool = (db as unknown as { $client: { end: () => Promise<void> } }).$client;
    await pool.end();
    process.exit(failures.length ? 1 : 0);
  });
