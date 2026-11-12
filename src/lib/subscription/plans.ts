/**
 * Madetom subscription plan configuration.
 *
 * This is the single source of truth for plan limits, pricing, feature
 * entitlements and subscription status rules. Backend enforcement reads from
 * here via src/lib/subscription/entitlements.ts.
 *
 * Plan rules:
 * - All plans provide essential POS and inventory functionality.
 * - Higher plans provide more capacity, reporting, management capabilities and
 *   advanced business tools.
 * - Basic product management, sales recording and stock updates are available
 *   on every tier; they are NOT exclusive to expensive tiers.
 */

export type PlanKey = "starter" | "growth" | "business";

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "pending_payment"
  | "past_due"
  | "suspended"
  | "expired"
  | "cancelled";

export interface PlanEntitlement {
  key: string;
  label: string;
  group: string;
  description: string;
}

export interface PlanConfig {
  key: PlanKey;
  name: string;
  description: string;
  /** Monthly price in pesewas (GHS minor units). */
  priceMonthly: number;
  currency: "GHS";
  /** null = unlimited products. */
  maxProducts: number | null;
  maxStaff: number;
  maxBranches: number;
  maxTransactionsPerMonth: number;
  smsCredits: number;
  features: PlanEntitlement[];
  isActive: boolean;
  sortOrder: number;
}

const GHS = 100; // 1 GHS = 100 pesewas

const STARTER_FEATURES: PlanEntitlement[] = [
  { key: "pos.use", label: "Point of sale", group: "Selling", description: "Fast, keyboard-first checkout." },
  { key: "products.manage", label: "Product management", group: "Catalogue", description: "Create, edit and archive products." },
  { key: "categories.manage", label: "Product categories", group: "Catalogue", description: "Organise products into categories." },
  { key: "inventory.view", label: "Inventory management", group: "Inventory", description: "Track stock levels across branches." },
  { key: "inventory.adjust", label: "Stock adjustments", group: "Inventory", description: "Record stock increases, decreases and corrections." },
  { key: "inventory.lowStockAlerts", label: "Low-stock alerts", group: "Inventory", description: "Receive SMS and in-app alerts when stock runs low." },
  { key: "customers.view", label: "Customer records", group: "Customers", description: "Maintain customer contact details." },
  { key: "customers.manage", label: "Manage customers", group: "Customers", description: "Add, edit and deactivate customers." },
  { key: "suppliers.view", label: "Supplier records", group: "Purchasing", description: "Maintain supplier contact details." },
  { key: "suppliers.manage", label: "Manage suppliers", group: "Purchasing", description: "Add, edit and deactivate suppliers." },
  { key: "purchases.manage", label: "Purchase recording", group: "Purchasing", description: "Record supplier purchases and receipts." },
  { key: "expenses.manage", label: "Expense tracking", group: "Finance", description: "Record business expenses." },
  { key: "sales.view", label: "Sales history", group: "Selling", description: "View completed sales and receipts." },
  { key: "receipts.generate", label: "Receipt generation", group: "Selling", description: "Print or email customer receipts." },
  { key: "reports.view", label: "Basic sales reports", group: "Reports", description: "View standard daily and monthly sales summaries." },
  { key: "reports.inventoryBasic", label: "Basic inventory reports", group: "Reports", description: "View stock levels and movement summaries." },
  { key: "reports.csvExport", label: "Essential CSV exports", group: "Reports", description: "Export sales and product data to CSV." },
  { key: "staff.basicPermissions", label: "Basic staff roles", group: "Team", description: "Assign cashier, manager or inventory manager roles." },
  { key: "dashboard.standard", label: "Standard dashboard", group: "Overview", description: "View core business metrics on the dashboard." },
];

const GROWTH_ONLY_FEATURES: PlanEntitlement[] = [
  { key: "reports.advancedSales", label: "Advanced sales reports", group: "Reports", description: "Detailed sales analysis by product, branch and period." },
  { key: "reports.profit", label: "Profit reporting", group: "Reports", description: "View gross and net profit by product and branch." },
  { key: "reports.inventoryValuation", label: "Inventory valuation", group: "Reports", description: "View the total value of current stock." },
  { key: "reports.purchases", label: "Detailed purchase reports", group: "Reports", description: "Track purchases by supplier and period." },
  { key: "reports.expenses", label: "Advanced expense reports", group: "Reports", description: "Categorise and analyse business expenses." },
  { key: "reports.csvImport", label: "CSV import and export", group: "Reports", description: "Bulk import products and export any report." },
  { key: "customers.debtTracking", label: "Customer debt tracking", group: "Customers", description: "Track customer balances and credit limits." },
  { key: "suppliers.balanceTracking", label: "Supplier balance tracking", group: "Purchasing", description: "Track amounts owed to each supplier." },
  { key: "reports.salesperson", label: "Salesperson performance reports", group: "Reports", description: "View sales performance by staff member." },
  { key: "staff.advancedPermissions", label: "Advanced staff permissions", group: "Team", description: "Granular role-based permission control." },
  { key: "inventory.movementHistory", label: "Detailed stock movement history", group: "Inventory", description: "Full audit trail of every stock movement." },
  { key: "dashboard.advanced", label: "Improved dashboard analytics", group: "Overview", description: "Enhanced dashboard with branch and product insights." },
  { key: "reports.branchLevel", label: "Branch-level reporting", group: "Reports", description: "View reports filtered by individual branch." },
];

const BUSINESS_ONLY_FEATURES: PlanEntitlement[] = [
  { key: "inventory.transfer", label: "Stock transfers between branches", group: "Inventory", description: "Move stock between branches and track transfers." },
  { key: "reports.branchAnalytics", label: "Advanced branch analytics", group: "Reports", description: "Compare performance across branches." },
  { key: "audit.comprehensive", label: "Comprehensive audit logs", group: "Security", description: "Full audit trail of all platform actions." },
  { key: "staff.advancedRoleManagement", label: "Advanced role and permission management", group: "Team", description: "Create custom roles with granular permissions." },
  { key: "reports.organisation", label: "Organisation-wide performance reports", group: "Reports", description: "Cross-branch and organisation-level insights." },
  { key: "reports.advancedInventory", label: "Advanced inventory reports", group: "Reports", description: "Deep dive into stock turns, ageing and wastage." },
  { key: "reports.businessInsights", label: "Advanced business insights", group: "Reports", description: "AI-assisted recommendations and forecasting." },
  { key: "support.priority", label: "Priority support", group: "Support", description: "Faster response from the Madetom support team." },
];

const GROWTH_FEATURES: PlanEntitlement[] = [...STARTER_FEATURES, ...GROWTH_ONLY_FEATURES];
const BUSINESS_FEATURES: PlanEntitlement[] = [...GROWTH_FEATURES, ...BUSINESS_ONLY_FEATURES];

export const PLAN_CONFIGS: Record<PlanKey, PlanConfig> = {
  starter: {
    key: "starter",
    name: "Starter",
    description: "For a single shop getting started.",
    priceMonthly: 500 * GHS,
    currency: "GHS",
    maxProducts: 1000,
    maxStaff: 5,
    maxBranches: 1,
    maxTransactionsPerMonth: 10000,
    smsCredits: 100,
    features: STARTER_FEATURES,
    isActive: true,
    sortOrder: 1,
  },
  growth: {
    key: "growth",
    name: "Growth",
    description: "For growing shops with multiple branches.",
    priceMonthly: 750 * GHS,
    currency: "GHS",
    maxProducts: 5000,
    maxStaff: 20,
    maxBranches: 3,
    maxTransactionsPerMonth: 50000,
    smsCredits: 250,
    features: GROWTH_FEATURES,
    isActive: true,
    sortOrder: 2,
  },
  business: {
    key: "business",
    name: "Business",
    description: "For established shops with multiple branches.",
    priceMonthly: 1000 * GHS,
    currency: "GHS",
    maxProducts: null, // unlimited
    maxStaff: 50,
    maxBranches: 5,
    maxTransactionsPerMonth: 200000,
    smsCredits: 500,
    features: BUSINESS_FEATURES,
    isActive: true,
    sortOrder: 3,
  },
} as const;

export const PLAN_KEYS: PlanKey[] = ["starter", "growth", "business"];

/** Human-readable description of what each subscription status means. */
export const SUBSCRIPTION_STATUS_RULES: Record<
  SubscriptionStatus,
  {
    label: string;
    writable: boolean;
    featureAccess: boolean;
    message: string;
  }
> = {
  trial: {
    label: "Trial",
    writable: true,
    featureAccess: true,
    message: "Your trial is active. All plan features are available.",
  },
  active: {
    label: "Active",
    writable: true,
    featureAccess: true,
    message: "Your subscription is active.",
  },
  pending_payment: {
    label: "Awaiting payment",
    writable: false,
    featureAccess: false,
    message:
      "Your workspace is ready, but it needs a verified payment before you can use the till, inventory and reports.",
  },
  past_due: {
    label: "Past due",
    writable: true,
    featureAccess: true,
    message:
      "Your last payment is past due. Update billing to avoid interruption. Your data and operations remain available.",
  },
  suspended: {
    label: "Suspended",
    writable: false,
    featureAccess: false,
    message:
      "This subscription is suspended. You can still view and export your records, but new changes are paused until billing is resolved.",
  },
  expired: {
    label: "Expired",
    writable: false,
    featureAccess: false,
    message:
      "This subscription has expired. You can still view your records, but new changes are paused until the plan is renewed.",
  },
  cancelled: {
    label: "Cancelled",
    writable: false,
    featureAccess: false,
    message:
      "This subscription is cancelled. Existing records are preserved and read-only until a new plan is assigned.",
  },
};

/**
 * Get all plan configs sorted by sort order.
 */
export function getAllPlans(): PlanConfig[] {
  return [...PLAN_KEYS].map((k) => getPlanConfig(k)).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Look up a plan config by key. Throws if the key is not a valid plan.
 */
export function getPlanConfig(key: string): PlanConfig {
  const plan = PLAN_CONFIGS[key as PlanKey];
  if (!plan) {
    throw new Error(`Unknown plan key: ${key}`);
  }
  return plan;
}

/**
 * Check whether a feature key is available on a given plan.
 */
export function planHasFeature(planKey: PlanKey, featureKey: string): boolean {
  return PLAN_CONFIGS[planKey]?.features.some((f) => f.key === featureKey) ?? false;
}

/**
 * Find the cheapest plan that includes a feature.
 */
export function cheapestPlanForFeature(featureKey: string): PlanKey | null {
  return PLAN_KEYS.find((key) => planHasFeature(key, featureKey)) ?? null;
}

/**
 * Find the feature definition across all plans.
 */
export function getFeatureDefinition(featureKey: string): PlanEntitlement | null {
  for (const plan of Object.values(PLAN_CONFIGS)) {
    const found = plan.features.find((feature) => feature.key === featureKey);
    if (found) return found;
  }
  return null;
}

/**
 * Check whether a plan key is valid.
 */
export function isValidPlanKey(key: string): key is PlanKey {
  return PLAN_KEYS.includes(key as PlanKey);
}

/**
 * Format a price in pesewas to a GHS display string.
 */
export function formatPlanPrice(pesewas: number): string {
  const ghs = pesewas / 100;
  return `GH₵${ghs.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a limit for display. null means unlimited.
 */
export function formatLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : limit.toLocaleString("en-GH");
}
