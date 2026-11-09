export const PERMISSION_CATALOG = [
  { key: "dashboard.view", label: "View dashboard", group: "Overview", sensitive: false },
  { key: "pos.use", label: "Use point of sale", group: "Selling", sensitive: false },
  { key: "sales.view", label: "View sales", group: "Selling", sensitive: false },
  { key: "sales.refund", label: "Refund sales", group: "Selling", sensitive: true },
  { key: "products.view", label: "View products", group: "Catalogue", sensitive: false },
  { key: "products.manage", label: "Create and edit products", group: "Catalogue", sensitive: false },
  { key: "categories.manage", label: "Manage categories", group: "Catalogue", sensitive: false },
  { key: "inventory.view", label: "View inventory", group: "Inventory", sensitive: false },
  { key: "inventory.adjust", label: "Adjust stock", group: "Inventory", sensitive: false },
  { key: "inventory.transfer", label: "Transfer stock", group: "Inventory", sensitive: false },
  { key: "suppliers.view", label: "View suppliers", group: "Purchasing", sensitive: false },
  { key: "suppliers.manage", label: "Manage suppliers", group: "Purchasing", sensitive: false },
  { key: "purchases.view", label: "View purchases", group: "Purchasing", sensitive: true },
  { key: "purchases.manage", label: "Record and receive purchases", group: "Purchasing", sensitive: true },
  { key: "customers.view", label: "View customers", group: "Customers", sensitive: false },
  { key: "customers.manage", label: "Manage customers", group: "Customers", sensitive: false },
  { key: "expenses.view", label: "View expenses", group: "Finance", sensitive: true },
  { key: "expenses.manage", label: "Manage expenses", group: "Finance", sensitive: true },
  { key: "reports.view", label: "View business reports", group: "Finance", sensitive: true },
  { key: "reports.export", label: "Export reports", group: "Finance", sensitive: true },
  { key: "staff.view", label: "View staff", group: "Team", sensitive: false },
  { key: "staff.manage", label: "Invite and manage staff", group: "Team", sensitive: true },
  { key: "branches.view_all", label: "Access all branches", group: "Branches", sensitive: true },
  { key: "branches.manage", label: "Manage branches", group: "Branches", sensitive: true },
  { key: "notifications.view", label: "View notifications", group: "Notifications", sensitive: false },
  { key: "notifications.manage", label: "Manage notification settings", group: "Notifications", sensitive: false },
  { key: "settings.view", label: "View business settings", group: "Settings", sensitive: true },
  { key: "settings.manage", label: "Manage business settings", group: "Settings", sensitive: true },
  { key: "subscription.view", label: "View subscription and usage", group: "Settings", sensitive: true },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

export const ALL_PERMISSIONS = PERMISSION_CATALOG.map((permission) => permission.key);

export const ROLE_CATALOG = {
  owner: {
    name: "Owner",
    description: "Full access to the business, people, finances and settings.",
    permissions: ALL_PERMISSIONS,
  },
  manager: {
    name: "Manager",
    description: "Runs day-to-day selling, stock and purchasing. No payroll-level access.",
    permissions: [
      "dashboard.view",
      "pos.use",
      "sales.view",
      "sales.refund",
      "products.view",
      "products.manage",
      "categories.manage",
      "inventory.view",
      "inventory.adjust",
      "inventory.transfer",
      "suppliers.view",
      "suppliers.manage",
      "purchases.view",
      "purchases.manage",
      "customers.view",
      "customers.manage",
      "reports.view",
      "reports.export",
      "staff.view",
      "branches.view_all",
      "notifications.view",
      "notifications.manage",
      "settings.view",
    ] as PermissionKey[],
  },
  cashier: {
    name: "Cashier",
    description: "Sells at the till and helps customers. No financial reports or purchasing.",
    permissions: [
      "dashboard.view",
      "pos.use",
      "sales.view",
      "products.view",
      "inventory.view",
      "customers.view",
      "customers.manage",
      "notifications.view",
    ] as PermissionKey[],
  },
  inventory_manager: {
    name: "Inventory Manager",
    description: "Owns products, stock, suppliers and purchase receiving.",
    permissions: [
      "dashboard.view",
      "products.view",
      "products.manage",
      "categories.manage",
      "inventory.view",
      "inventory.adjust",
      "inventory.transfer",
      "suppliers.view",
      "suppliers.manage",
      "purchases.view",
      "purchases.manage",
      "notifications.view",
    ] as PermissionKey[],
  },
} as const;

export type RoleKey = keyof typeof ROLE_CATALOG;

export const ROLE_KEYS = Object.keys(ROLE_CATALOG) as RoleKey[];

export function isRoleKey(value: string): value is RoleKey {
  return Object.prototype.hasOwnProperty.call(ROLE_CATALOG, value);
}

export function isPermissionKey(value: string): value is PermissionKey {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

export function effectivePermissions(
  roleKey: string,
  override?: { grant?: string[]; revoke?: string[] } | null,
): Set<PermissionKey> {
  if (roleKey === "owner") return new Set(ALL_PERMISSIONS);
  const base = new Set<PermissionKey>(
    ROLE_CATALOG[roleKey as RoleKey]?.permissions ?? ([] as PermissionKey[]),
  );
  for (const key of override?.grant ?? []) {
    if (isPermissionKey(key)) base.add(key);
  }
  for (const key of override?.revoke ?? []) {
    if (isPermissionKey(key)) base.delete(key);
  }
  return base;
}

export const PERMISSION_GROUPS = Array.from(
  PERMISSION_CATALOG.reduce((groups, permission) => {
    groups.set(permission.group, [...(groups.get(permission.group) ?? []), permission]);
    return groups;
  }, new Map<string, Array<(typeof PERMISSION_CATALOG)[number]>>()),
).map(([group, items]) => ({ group, items }));
