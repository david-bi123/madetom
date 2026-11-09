import { loadEnvConfig } from "@next/env";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  auditLogs,
  branches,
  customers,
  documentSequences,
  expenses,
  invitations,
  notificationPreferences,
  notifications,
  payments,
  platformSettings,
  productCategories,
  productStock,
  productVariants,
  products,
  purchaseItems,
  purchases,
  rolePermissions,
  roles,
  saleItems,
  sales,
  smsTransactions,
  smsWallets,
  stockMovements,
  subscriptionPlans,
  subscriptions,
  suppliers,
  tenantMemberships,
  tenants,
  users,
  variantStock,
  permissions as permissionsTable,
} from "../src/lib/db/schema";
import { PERMISSION_CATALOG, ROLE_CATALOG, ROLE_KEYS } from "../src/lib/permissions";

loadEnvConfig(process.cwd());
const withDemo = process.argv.includes("--demo");

const now = new Date();
const hash = (value: string) =>
  createHash("sha256")
    .update(`${value}.${process.env.TOKEN_PEPPER ?? process.env.AUTH_SECRET ?? "dev-pepper"}`)
    .digest("hex");

function id() {
  return crypto.randomUUID();
}

async function seedSystem() {
  for (const permission of PERMISSION_CATALOG) {
    await db
      .insert(permissionsTable)
      .values({
        key: permission.key,
        label: permission.label,
        groupName: permission.group,
        sensitive: permission.sensitive,
      })
      .onDuplicateKeyUpdate({
        set: {
          label: permission.label,
          groupName: permission.group,
          sensitive: permission.sensitive,
        },
      });
  }

  for (const roleKey of ROLE_KEYS) {
    const role = ROLE_CATALOG[roleKey];
    await db
      .insert(roles)
      .values({ key: roleKey, name: role.name, description: role.description })
      .onDuplicateKeyUpdate({ set: { name: role.name, description: role.description } });
  }

  await db.delete(rolePermissions);
  const assignments = ROLE_KEYS.flatMap((roleKey) =>
    ROLE_CATALOG[roleKey].permissions.map((permissionKey) => ({
      roleKey,
      permissionKey,
    })),
  );
  await db.insert(rolePermissions).values(assignments);

  const planSeeds = [
    {
      key: "trial",
      name: "Free Trial",
      description: "A complete trial of Madetom for a new business.",
      priceMonthly: "0.00",
      priceYearly: "0.00",
      maxEmployees: 3,
      maxBranches: 1,
      maxProducts: 100,
      maxTransactionsPerMonth: 300,
      smsCredits: 20,
      features: ["1 branch", "3 staff accounts", "100 products", "300 sales per month", "20 SMS credits"],
      sortOrder: 1,
    },
    {
      key: "starter",
      name: "Starter",
      description: "For a single shop that is getting organised.",
      priceMonthly: "99.00",
      priceYearly: "990.00",
      maxEmployees: 5,
      maxBranches: 1,
      maxProducts: 500,
      maxTransactionsPerMonth: 2000,
      smsCredits: 100,
      features: ["1 branch", "5 staff accounts", "500 products", "2,000 sales per month", "100 SMS credits"],
      sortOrder: 2,
    },
    {
      key: "business",
      name: "Business",
      description: "For growing businesses with more than one location.",
      priceMonthly: "249.00",
      priceYearly: "2490.00",
      maxEmployees: 15,
      maxBranches: 3,
      maxProducts: 5000,
      maxTransactionsPerMonth: 10000,
      smsCredits: 500,
      features: ["3 branches", "15 staff accounts", "5,000 products", "10,000 sales per month", "500 SMS credits"],
      sortOrder: 3,
    },
    {
      key: "premium",
      name: "Premium",
      description: "For established retailers and distributors.",
      priceMonthly: "499.00",
      priceYearly: "4990.00",
      maxEmployees: 50,
      maxBranches: 10,
      maxProducts: 50000,
      maxTransactionsPerMonth: 100000,
      smsCredits: 2000,
      features: ["10 branches", "50 staff accounts", "50,000 products", "100,000 sales per month", "2,000 SMS credits"],
      sortOrder: 4,
    },
  ];

  const existingPlans = await db.select({ key: subscriptionPlans.key }).from(subscriptionPlans);
  const existingKeys = new Set(existingPlans.map((plan) => plan.key));
  const missingPlans = planSeeds.filter((plan) => !existingKeys.has(plan.key));
  if (missingPlans.length) await db.insert(subscriptionPlans).values(missingPlans);

  const defaults: Array<{ key: string; value: unknown }> = [
    { key: "platform_name", value: "Madetom" },
    { key: "support_email", value: "support@madetom.app" },
    { key: "default_country", value: "Ghana" },
    { key: "default_region", value: "Greater Accra" },
    { key: "default_trial_days", value: 14 },
    { key: "invitation_expiry_hours", value: 72 },
    { key: "sms_password_reset", value: true },
  ];
  for (const setting of defaults) {
    await db
      .insert(platformSettings)
      .values({ key: setting.key, value: setting.value })
      .onDuplicateKeyUpdate({ set: { key: setting.key } });
  }

  const adminEmail = (process.env.SUPER_ADMIN_EMAIL ?? "admin@madetom.app").toLowerCase();
  const [existingAdmin] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (!existingAdmin) {
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (!password) throw new Error("SUPER_ADMIN_PASSWORD is required to seed the platform administrator.");
    await db.insert(users).values({
      id: id(),
      name: process.env.SUPER_ADMIN_NAME ?? "Platform Administrator",
      email: adminEmail,
      passwordHash: await bcrypt.hash(password, 12),
      isSuperAdmin: true,
      status: "active",
    });
    console.log(`✓ Platform administrator created: ${adminEmail}`);
  } else {
    await db
      .update(users)
      .set({
        isSuperAdmin: true,
        status: "active",
        ...(process.env.RESET_SUPER_ADMIN === "true" && process.env.SUPER_ADMIN_PASSWORD
          ? { passwordHash: await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 12) }
          : {}),
      })
      .where(eq(users.id, existingAdmin.id));
    console.log(`✓ Platform administrator ready: ${adminEmail}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Demo workspace                                                              */
/* -------------------------------------------------------------------------- */

type DemoEntry = {
  key: string;
  name: string;
  variantName?: string;
  productId: string;
  variantId?: string;
  categoryId: string;
  supplierId: string;
  sku: string;
  barcode: string;
  cost: number;
  price: number;
  reorder: number;
  unit: string;
  stock: { main: number; osu: number };
  imageUrl?: string;
};

function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

async function seedDemo() {
  const [existing] = await db.select().from(tenants).where(eq(tenants.slug, "adom-provisions")).limit(1);
  if (existing) {
    console.log("• Demo workspace already exists — skipping");
    return;
  }

  const demoPassword = await bcrypt.hash("Madetom@2026!", 12);
  const tenantId = id();
  const ownerId = id();
  const managerId = id();
  const cashierId = id();
  const inventoryManagerId = id();

  const mainBranchId = id();
  const osuBranchId = id();

  await db.insert(tenants).values({
    id: tenantId,
    name: "Adom Provisions",
    slug: "adom-provisions",
    businessType: "Grocery & provisions",
    country: "Ghana",
    region: "Greater Accra",
    location: "Adabraka, Accra",
    phone: "+233244123456",
    email: "hello@adomprovisions.example",
    currency: "GHS",
    timezone: "Africa/Accra",
    taxRate: "0.000",
    pricesIncludeTax: true,
    allowPartialPayments: true,
    status: "active",
    onboardingCompletedAt: new Date(now.getTime() - 30 * 86400000),
    createdBy: ownerId,
  });

  await db.insert(users).values([
    {
      id: ownerId,
      name: "Ama Mensah",
      email: "owner@demo.madetom.app",
      phone: "+233244123456",
      passwordHash: demoPassword,
      status: "active",
    },
    {
      id: managerId,
      name: "Kofi Boateng",
      email: "manager@demo.madetom.app",
      phone: "+233244123457",
      passwordHash: demoPassword,
      status: "active",
    },
    {
      id: cashierId,
      name: "Efua Owusu",
      email: "cashier@demo.madetom.app",
      phone: "+233244123458",
      passwordHash: demoPassword,
      status: "active",
    },
    {
      id: inventoryManagerId,
      name: "Yaw Asare",
      email: "inventory@demo.madetom.app",
      phone: "+233244123459",
      passwordHash: demoPassword,
      status: "active",
    },
  ]);

  await db.insert(branches).values([
    {
      id: mainBranchId,
      tenantId,
      name: "Adabraka Shop",
      code: "ADB",
      address: "Ring Road Central, Adabraka, Accra",
      phone: "+233244123456",
      isDefault: true,
    },
    {
      id: osuBranchId,
      tenantId,
      name: "Osu Kiosk",
      code: "OSU",
      address: "Oxford Street, Osu, Accra",
      phone: "+233244123460",
      isDefault: false,
    },
  ]);

  await db.insert(tenantMemberships).values([
    {
      id: id(),
      tenantId,
      userId: ownerId,
      roleKey: "owner",
      defaultBranchId: mainBranchId,
      status: "active",
      joinedAt: new Date(now.getTime() - 30 * 86400000),
    },
    {
      id: id(),
      tenantId,
      userId: managerId,
      roleKey: "manager",
      defaultBranchId: mainBranchId,
      status: "active",
      invitedBy: ownerId,
      joinedAt: new Date(now.getTime() - 25 * 86400000),
    },
    {
      id: id(),
      tenantId,
      userId: cashierId,
      roleKey: "cashier",
      defaultBranchId: osuBranchId,
      status: "active",
      invitedBy: ownerId,
      joinedAt: new Date(now.getTime() - 20 * 86400000),
    },
    {
      id: id(),
      tenantId,
      userId: inventoryManagerId,
      roleKey: "inventory_manager",
      defaultBranchId: mainBranchId,
      status: "active",
      invitedBy: ownerId,
      joinedAt: new Date(now.getTime() - 18 * 86400000),
    },
  ]);

  await db.insert(notificationPreferences).values({
    id: id(),
    tenantId,
    userId: ownerId,
    lowStock: true,
    outOfStock: true,
    dailySummary: true,
    stockAdjustments: true,
    smsLowStock: false,
    smsOutOfStock: false,
    smsDailySummary: false,
  });

  await db.insert(smsWallets).values({ id: id(), tenantId, credits: 500 });
  await db.insert(smsTransactions).values({
    id: id(),
    tenantId,
    type: "credit",
    credits: 500,
    balanceAfter: 500,
    reference: "plan-business",
    description: "Included SMS credits · Business plan",
    createdBy: ownerId,
  });

  await db.insert(subscriptions).values({
    id: id(),
    tenantId,
    planKey: "business",
    status: "active",
    billingCycle: "yearly",
    currentPeriodStart: new Date(now.getTime() - 30 * 86400000),
    currentPeriodEnd: new Date(now.getTime() + 335 * 86400000),
    notes: "Demo subscription managed by the platform administrator.",
  });

  const categories = [
    { name: "Pantry Staples", id: id() },
    { name: "Beverages", id: id() },
    { name: "Household", id: id() },
    { name: "Personal Care", id: id() },
    { name: "Snacks", id: id() },
  ];
  await db.insert(productCategories).values(
    categories.map((category) => ({ id: category.id, tenantId, name: category.name })),
  );
  const categoryId = (name: string) => categories.find((category) => category.name === name)!.id;

  const supplierRows = [
    { id: id(), tenantId, name: "Nkrumah Wholesale", contactName: "Kojo Nkrumah", phone: "+233200000001", address: "Kaneshie Market, Accra" },
    { id: id(), tenantId, name: "Tema Foods Supply", contactName: "Adjoa Tetteh", phone: "+233200000002", address: "Community 1, Tema" },
    { id: id(), tenantId, name: "Coastal Households Ltd", contactName: "Nii Armah", phone: "+233200000003", address: "Industrial Area, Accra" },
  ];
  await db.insert(suppliers).values(supplierRows);
  const supplierId = (name: string) => supplierRows.find((supplier) => supplier.name === name)!.id;

  const baseProducts = [
    { key: "rice", name: "Royal Feast Rice 5kg", category: "Pantry Staples", supplier: "Nkrumah Wholesale", cost: 55, price: 72, reorder: 10, unit: "bag", stock: { main: 34, osu: 12 }, barcode: "6001001000011" },
    { key: "oil", name: "Sunseed Cooking Oil 1L", category: "Pantry Staples", supplier: "Tema Foods Supply", cost: 18, price: 26, reorder: 8, unit: "bottle", stock: { main: 18, osu: 8 }, barcode: "6001001000028" },
    { key: "milo", name: "Milo 400g", category: "Beverages", supplier: "Nkrumah Wholesale", cost: 25, price: 34, reorder: 8, unit: "tin", stock: { main: 20, osu: 9 }, barcode: "6001001000035" },
    { key: "milk", name: "Ideal Milk 380g", category: "Pantry Staples", supplier: "Tema Foods Supply", cost: 9, price: 13, reorder: 12, unit: "tin", stock: { main: 30, osu: 15 }, barcode: "6001001000042" },
    { key: "sachet", name: "Sachet Water Pack", category: "Beverages", supplier: "Tema Foods Supply", cost: 3.5, price: 5, reorder: 20, unit: "pack", stock: { main: 64, osu: 30 }, barcode: "6001001000059" },
    { key: "voltic", name: "Voltic 750ml", category: "Beverages", supplier: "Tema Foods Supply", cost: 4, price: 6, reorder: 24, unit: "bottle", stock: { main: 40, osu: 18 }, barcode: "6001001000066" },
    { key: "coke", name: "Coca-Cola 1.5L", category: "Beverages", supplier: "Nkrumah Wholesale", cost: 12, price: 18, reorder: 12, unit: "bottle", stock: { main: 22, osu: 10 }, barcode: "6001001000073" },
    { key: "sugar", name: "Sugar 1kg", category: "Pantry Staples", supplier: "Nkrumah Wholesale", cost: 12, price: 18, reorder: 10, unit: "pack", stock: { main: 19, osu: 7 }, barcode: "6001001000080" },
    { key: "tomato", name: "Tomato Paste 70g", category: "Pantry Staples", supplier: "Nkrumah Wholesale", cost: 2.2, price: 3.5, reorder: 24, unit: "sachet", stock: { main: 52, osu: 24 }, barcode: "6001001000097" },
    { key: "soap", name: "Key Soap 400g", category: "Household", supplier: "Coastal Households Ltd", cost: 5, price: 8, reorder: 15, unit: "bar", stock: { main: 26, osu: 11 }, barcode: "6001001000103" },
    { key: "omo", name: "Omo 500g", category: "Household", supplier: "Coastal Households Ltd", cost: 14, price: 22, reorder: 8, unit: "pack", stock: { main: 13, osu: 5 }, barcode: "6001001000110" },
    { key: "toothpaste", name: "Toothpaste 100ml", category: "Personal Care", supplier: "Coastal Households Ltd", cost: 8, price: 14, reorder: 8, unit: "tube", stock: { main: 15, osu: 6 }, barcode: "6001001000127" },
    { key: "biscuits", name: "Digestive Biscuits", category: "Snacks", supplier: "Nkrumah Wholesale", cost: 6, price: 10, reorder: 10, unit: "pack", stock: { main: 10, osu: 4 }, barcode: "6001001000134" },
    { key: "chips", name: "Plantain Chips 100g", category: "Snacks", supplier: "Nkrumah Wholesale", cost: 4, price: 8, reorder: 10, unit: "pack", stock: { main: 5, osu: 3 }, barcode: "6001001000141" },
    { key: "eggs", name: "Eggs Crate (30)", category: "Pantry Staples", supplier: "Tema Foods Supply", cost: 28, price: 40, reorder: 10, unit: "crate", stock: { main: 6, osu: 4 }, barcode: "6001001000158" },
    { key: "coffee", name: "Instant Coffee 200g", category: "Beverages", supplier: "Nkrumah Wholesale", cost: 38, price: 52, reorder: 5, unit: "jar", stock: { main: 0, osu: 2 }, barcode: "6001001000165" },
    { key: "broom", name: "Palm Broom", category: "Household", supplier: "Coastal Households Ltd", cost: 9, price: 15, reorder: 6, unit: "piece", stock: { main: 12, osu: 4 }, barcode: "6001001000172" },
  ];

  const entries: DemoEntry[] = [];

  for (const item of baseProducts) {
    const productId = id();
    entries.push({
      key: item.key,
      name: item.name,
      productId,
      categoryId: categoryId(item.category),
      supplierId: supplierId(item.supplier),
      sku: `ADOM-${item.key.toUpperCase()}`,
      barcode: item.barcode,
      cost: item.cost,
      price: item.price,
      reorder: item.reorder,
      unit: item.unit,
      stock: item.stock,
    });
    await db.insert(products).values({
      id: productId,
      tenantId,
      categoryId: categoryId(item.category),
      supplierId: supplierId(item.supplier),
      name: item.name,
      sku: `ADOM-${item.key.toUpperCase()}`,
      barcode: item.barcode,
      description: `${item.name}, sold by ${item.unit}.`,
      costPrice: item.cost.toFixed(2),
      sellingPrice: item.price.toFixed(2),
      reorderLevel: item.reorder,
      unit: item.unit,
      hasVariants: false,
      status: "active",
    });
  }

  // A product with variants to demonstrate variant-level stock.
  const juiceProductId = id();
  await db.insert(products).values({
    id: juiceProductId,
    tenantId,
    categoryId: categoryId("Beverages"),
    supplierId: supplierId("Tema Foods Supply"),
    name: "Fresh Fruit Juice",
    sku: "ADOM-JUICE",
    barcode: "6001001000189",
    description: "Chilled 500ml fruit juice. Choose a flavour.",
    costPrice: "7.00",
    sellingPrice: "12.00",
    reorderLevel: 6,
    unit: "bottle",
    hasVariants: true,
    status: "active",
  });
  const juiceVariants = [
    { name: "Mango 500ml", sku: "ADOM-JUICE-MANGO", stock: { main: 12, osu: 5 } },
    { name: "Pineapple 500ml", sku: "ADOM-JUICE-PINE", stock: { main: 9, osu: 4 } },
  ];
  for (const variant of juiceVariants) {
    const variantId = id();
    entries.push({
      key: `juice-${variant.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: "Fresh Fruit Juice",
      variantName: variant.name,
      productId: juiceProductId,
      variantId,
      categoryId: categoryId("Beverages"),
      supplierId: supplierId("Tema Foods Supply"),
      sku: variant.sku,
      barcode: "",
      cost: 7,
      price: 12,
      reorder: 6,
      unit: "bottle",
      stock: variant.stock,
    });
    await db.insert(productVariants).values({
      id: variantId,
      tenantId,
      productId: juiceProductId,
      name: variant.name,
      sku: variant.sku,
      costPrice: "7.00",
      sellingPrice: "12.00",
      reorderLevel: 6,
      status: "active",
    });
  }

  const customerRows = [
    { id: id(), name: "Akosua Frimpong", phone: "+233200000101" },
    { id: id(), name: "Daniel Ofori", phone: "+233200000102" },
    { id: id(), name: "Naa Adjeley", phone: "+233200000103" },
    { id: id(), name: "Ibrahim Sulemana", phone: "+233200000104" },
  ];
  await db.insert(customers).values(
    customerRows.map((customer) => ({
      ...customer,
      tenantId,
      email: null,
      address: null,
      notes: null,
      status: "active" as const,
    })),
  );

  // Build historical sales, then open stock with purchases so the ledger nets
  // exactly to the intended current quantities.
  const random = rng(20261105);
  const sold = new Map<string, number>();
  const salePlans: Array<{
    id: string;
    branchId: string;
    cashierId: string;
    customerId: string | null;
    createdAt: Date;
    items: Array<{ entry: DemoEntry; quantity: number }>;
    discount: number;
    method: "cash" | "momo" | "bank" | "card";
    amountPaid: number;
    total: number;
  }> = [];

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - dayOffset);
    dayStart.setHours(0, 0, 0, 0);
    const maxHour = dayOffset === 0 ? Math.max(10, now.getHours()) : 19;
    const salesCount = dayOffset === 0 ? 3 : 5 + Math.floor(random() * 4);

    for (let index = 0; index < salesCount; index++) {
      const branch = random() > 0.42 ? mainBranchId : osuBranchId;
      const hour = 9 + Math.floor(random() * Math.max(1, maxHour - 9));
      const createdAt = new Date(dayStart);
      createdAt.setHours(Math.min(hour, 20), Math.floor(random() * 60), 0, 0);
      if (dayOffset === 0 && createdAt > now) createdAt.setTime(now.getTime() - 5 * 60 * 1000);

      const itemCount = 1 + Math.floor(random() * 3);
      const chosen = new Set<string>();
      const items: Array<{ entry: DemoEntry; quantity: number }> = [];
      for (let attempt = 0; attempt < itemCount * 3 && items.length < itemCount; attempt++) {
        const entry = entries[Math.floor(random() * entries.length)];
        if (chosen.has(entry.key)) continue;
        // Do not sell the Osu coffee below its opening quantity.
        if (entry.key === "coffee" && branch === osuBranchId) continue;
        chosen.add(entry.key);
        const quantity = 1 + Math.floor(random() * 3);
        items.push({ entry, quantity });
      }
      if (!items.length) continue;

      const subtotal = items.reduce((sum, item) => sum + Math.round(item.entry.price * 100) * item.quantity, 0);
      const discount = random() > 0.82 ? Math.min(500, subtotal) : 0;
      const total = subtotal - discount;
      const methods = ["cash", "cash", "momo", "momo", "bank", "card"] as const;
      const method = methods[Math.floor(random() * methods.length)];
      const partial = random() > 0.96 && total > 2000;
      const amountPaid = partial ? Math.round(total / 2 / 100) * 100 : total;

      for (const item of items) {
        const saleKey = `${branch}:${item.entry.key}`;
        sold.set(saleKey, (sold.get(saleKey) ?? 0) + item.quantity);
      }

      salePlans.push({
        id: id(),
        branchId: branch,
        cashierId:
          branch === osuBranchId
            ? cashierId
            : [ownerId, managerId, inventoryManagerId][Math.floor(random() * 3)],
        customerId: random() > 0.6 ? customerRows[Math.floor(random() * customerRows.length)].id : null,
        createdAt,
        items,
        discount,
        method,
        amountPaid,
        total,
      });
    }
  }

  // Opening purchases: one per branch, dated before the sales window.
  const purchasesByBranch = [mainBranchId, osuBranchId].map((branchId, branchIndex) => {
    const reference = `PO-${String(branchIndex + 1).padStart(5, "0")}`;
    const createdAt = new Date(now.getTime() - 22 * 86400000);
    const supplierForPurchase = supplierRows[branchIndex % supplierRows.length];
    const items = entries.map((entry) => {
      const quantity =
        (branchId === mainBranchId ? entry.stock.main : entry.stock.osu) +
        (sold.get(`${branchId}:${entry.key}`) ?? 0);
      return { entry, quantity };
    }).filter((item) => item.quantity > 0);

    const subtotal = items.reduce((sum, item) => sum + Math.round(item.entry.cost * 100) * item.quantity, 0);
    return {
      id: id(),
      branchId,
      reference,
      supplierId: supplierForPurchase.id,
      createdAt,
      items,
      subtotal,
    };
  });

  const stockBalances = new Map<string, number>();

  for (const purchase of purchasesByBranch) {
    await db.insert(purchases).values({
      id: purchase.id,
      tenantId,
      branchId: purchase.branchId,
      supplierId: purchase.supplierId,
      reference: purchase.reference,
      status: "received",
      subtotal: (purchase.subtotal / 100).toFixed(2),
      taxAmount: "0.00",
      total: (purchase.subtotal / 100).toFixed(2),
      amountPaid: (purchase.subtotal / 100).toFixed(2),
      notes: "Opening stock purchase",
      receivedAt: purchase.createdAt,
      receivedBy: ownerId,
      createdBy: ownerId,
      createdAt: purchase.createdAt,
      updatedAt: purchase.createdAt,
    });

    await db.insert(payments).values({
      id: id(),
      tenantId,
      purchaseId: purchase.id,
      method: "bank",
      amount: (purchase.subtotal / 100).toFixed(2),
      reference: `TRF-${purchase.reference}`,
      note: "Opening stock supplier payment",
      createdBy: ownerId,
      createdAt: purchase.createdAt,
    });

    for (const item of purchase.items) {
      const lineTotal = Math.round(item.entry.cost * 100) * item.quantity;
      await db.insert(purchaseItems).values({
        id: id(),
        tenantId,
        purchaseId: purchase.id,
        productId: item.entry.productId,
        variantId: item.entry.variantId ?? null,
        nameSnapshot: item.entry.variantName
          ? `${item.entry.name} (${item.entry.variantName})`
          : item.entry.name,
        quantity: item.quantity,
        unitCost: item.entry.cost.toFixed(2),
        lineTotal: (lineTotal / 100).toFixed(2),
      });

      const stockKey = `${purchase.branchId}:${item.entry.key}`;
      stockBalances.set(stockKey, item.quantity);
    }
  }

  // Insert current stock rows with the opening balance. Sales below will reduce
  // the running balance and we'll persist the final quantity afterwards.
  for (const entry of entries) {
    for (const [branchId] of [
      [mainBranchId],
      [osuBranchId],
    ] as const) {
      const key = `${branchId}:${entry.key}`;
      const opening = stockBalances.get(key) ?? 0;
      if (entry.variantId) {
        const [existing] = await db
          .select({ id: variantStock.id })
          .from(variantStock)
          .where(and(eq(variantStock.variantId, entry.variantId), eq(variantStock.branchId, branchId)))
          .limit(1);
        if (!existing) {
          await db.insert(variantStock).values({
            id: id(),
            tenantId,
            variantId: entry.variantId,
            productId: entry.productId,
            branchId,
            quantity: opening,
            reorderLevel: entry.reorder,
          });
        }
      } else {
        const [existing] = await db
          .select({ id: productStock.id })
          .from(productStock)
          .where(and(eq(productStock.productId, entry.productId), eq(productStock.branchId, branchId)))
          .limit(1);
        if (!existing) {
          await db.insert(productStock).values({
            id: id(),
            tenantId,
            productId: entry.productId,
            branchId,
            quantity: opening,
            reorderLevel: entry.reorder,
          });
        }
      }
    }
  }

  // Stock movements for the opening purchases. They are inserted with the
  // purchase timestamps below.
  const purchaseMovements: Array<{
    id: string;
    tenantId: string;
    branchId: string;
    productId: string;
    variantId: string | null;
    type: "purchase";
    quantityDelta: number;
    balanceAfter: number;
    referenceType: string;
    referenceId: string;
    referenceLabel: string;
    note: string;
    createdBy: string;
    createdAt: Date;
  }> = [];

  for (const purchase of purchasesByBranch) {
    for (const item of purchase.items) {
      purchaseMovements.push({
        id: id(),
        tenantId,
        branchId: purchase.branchId,
        productId: item.entry.productId,
        variantId: item.entry.variantId ?? null,
        type: "purchase",
        quantityDelta: item.quantity,
        balanceAfter: item.quantity,
        referenceType: "purchase",
        referenceId: purchase.id,
        referenceLabel: purchase.reference,
        note: "Opening stock received",
        createdBy: ownerId,
        createdAt: purchase.createdAt,
      });
    }
  }

  if (purchaseMovements.length) {
    await db.insert(stockMovements).values(purchaseMovements);
  }

  const salesSorted = [...salePlans].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let receiptNumber = 1;

  for (const sale of salesSorted) {
    const subtotal = sale.items.reduce((sum, item) => sum + Math.round(item.entry.price * 100) * item.quantity, 0);
    const total = subtotal - sale.discount;
    const receipt = `MT-${String(receiptNumber).padStart(5, "0")}`;
    receiptNumber += 1;

    await db.insert(sales).values({
      id: sale.id,
      tenantId,
      branchId: sale.branchId,
      receiptNumber: receipt,
      customerId: sale.customerId,
      cashierId: sale.cashierId,
      status: "completed",
      subtotal: (subtotal / 100).toFixed(2),
      discountAmount: (sale.discount / 100).toFixed(2),
      taxAmount: "0.00",
      total: (total / 100).toFixed(2),
      amountPaid: (sale.amountPaid / 100).toFixed(2),
      changeDue: (Math.max(0, sale.amountPaid - total) / 100).toFixed(2),
      paymentStatus: sale.amountPaid < total ? "partial" : "paid",
      createdAt: sale.createdAt,
      updatedAt: sale.createdAt,
    });

    await db.insert(payments).values({
      id: id(),
      tenantId,
      saleId: sale.id,
      method: sale.method,
      amount: (sale.amountPaid / 100).toFixed(2),
      reference: sale.method === "momo" ? `MOMO-${receipt}` : null,
      createdBy: sale.cashierId,
      createdAt: sale.createdAt,
    });

    for (const item of sale.items) {
      const lineTotal = Math.round(item.entry.price * 100) * item.quantity;
      await db.insert(saleItems).values({
        id: id(),
        tenantId,
        saleId: sale.id,
        productId: item.entry.productId,
        variantId: item.entry.variantId ?? null,
        nameSnapshot: item.entry.variantName
          ? `${item.entry.name} (${item.entry.variantName})`
          : item.entry.name,
        skuSnapshot: item.entry.sku,
        unitPrice: item.entry.price.toFixed(2),
        unitCost: item.entry.cost.toFixed(2),
        quantity: item.quantity,
        discountAmount: "0.00",
        taxAmount: "0.00",
        lineTotal: (lineTotal / 100).toFixed(2),
      });

      const stockKey = `${sale.branchId}:${item.entry.key}`;
      const current = stockBalances.get(stockKey) ?? 0;
      const next = current - item.quantity;
      stockBalances.set(stockKey, next);
      await db.insert(stockMovements).values({
        id: id(),
        tenantId,
        branchId: sale.branchId,
        productId: item.entry.productId,
        variantId: item.entry.variantId ?? null,
        type: "sale",
        quantityDelta: -item.quantity,
        balanceAfter: next,
        referenceType: "sale",
        referenceId: sale.id,
        referenceLabel: receipt,
        note: null,
        createdBy: sale.cashierId,
        createdAt: sale.createdAt,
      });
    }
  }

  for (const entry of entries) {
    for (const [branchId, finalQuantity] of [
      [mainBranchId, entry.stock.main],
      [osuBranchId, entry.stock.osu],
    ] as const) {
      if (entry.variantId) {
        await db
          .update(variantStock)
          .set({ quantity: finalQuantity })
          .where(and(eq(variantStock.variantId, entry.variantId), eq(variantStock.branchId, branchId)));
      } else {
        await db
          .update(productStock)
          .set({ quantity: finalQuantity })
          .where(and(eq(productStock.productId, entry.productId), eq(productStock.branchId, branchId)));
      }
    }
  }

  await db.insert(documentSequences).values([
    { id: id(), tenantId, key: "sale", prefix: "MT-", nextNumber: receiptNumber },
    { id: id(), tenantId, key: "purchase", prefix: "PO-", nextNumber: 3 },
    { id: id(), tenantId, key: "adjustment", prefix: "ADJ-", nextNumber: 1 },
    { id: id(), tenantId, key: "transfer", prefix: "TRF-", nextNumber: 1 },
  ]);

  const expenseRows = [
    { category: "Rent", description: "Shop rent · Adabraka", amount: 2200, daysAgo: 12, method: "bank" as const },
    { category: "Utilities", description: "ECG electricity token", amount: 180, daysAgo: 10, method: "momo" as const },
    { category: "Transport", description: "Stock pickup from Kaneshie", amount: 85, daysAgo: 9, method: "cash" as const },
    { category: "Utilities", description: "Water bill", amount: 120, daysAgo: 8, method: "momo" as const },
    { category: "Supplies", description: "Receipt paper and packaging", amount: 65, daysAgo: 6, method: "cash" as const },
    { category: "Repairs", description: "Repair freezer door", amount: 240, daysAgo: 5, method: "cash" as const },
    { category: "Utilities", description: "Internet data bundle", amount: 100, daysAgo: 4, method: "momo" as const },
    { category: "Rent", description: "Osu kiosk rent", amount: 650, daysAgo: 2, method: "bank" as const },
  ];
  await db.insert(expenses).values(
    expenseRows.map((expense) => {
      const date = new Date(now);
      date.setDate(date.getDate() - expense.daysAgo);
      return {
        id: id(),
        tenantId,
        branchId: expense.description.startsWith("Osu") ? osuBranchId : mainBranchId,
        category: expense.category,
        description: expense.description,
        amount: expense.amount.toFixed(2),
        expenseDate: date.toISOString().slice(0, 10),
        paymentMethod: expense.method,
        createdBy: ownerId,
        createdAt: date,
        updatedAt: date,
      };
    }),
  );

  await db.insert(notifications).values([
    {
      id: id(),
      tenantId,
      userId: ownerId,
      type: "out_of_stock",
      title: "Out of stock: Instant Coffee 200g",
      body: "Instant Coffee 200g has run out at Adabraka Shop. Record a purchase or adjust stock to replenish it.",
      level: "critical",
      entityType: "product",
      entityId: entries.find((entry) => entry.key === "coffee")!.productId,
      conditionKey: `stock:${mainBranchId}:${entries.find((entry) => entry.key === "coffee")!.productId}:base`,
    },
    {
      id: id(),
      tenantId,
      userId: ownerId,
      type: "low_stock",
      title: "Low stock: Plantain Chips 100g",
      body: "Plantain Chips 100g is down to 5 units at Adabraka Shop. Reorder level is 10.",
      level: "warning",
      entityType: "product",
      entityId: entries.find((entry) => entry.key === "chips")!.productId,
      conditionKey: `stock:${mainBranchId}:${entries.find((entry) => entry.key === "chips")!.productId}:base`,
    },
    {
      id: id(),
      tenantId,
      userId: ownerId,
      type: "low_stock",
      title: "Low stock: Eggs Crate (30)",
      body: "Eggs Crate (30) is down to 6 units at Adabraka Shop. Reorder level is 10.",
      level: "warning",
      entityType: "product",
      entityId: entries.find((entry) => entry.key === "eggs")!.productId,
      conditionKey: `stock:${mainBranchId}:${entries.find((entry) => entry.key === "eggs")!.productId}:base`,
    },
  ]);

  const invitationId = id();
  await db.insert(invitations).values({
    id: invitationId,
    tenantId,
    type: "staff",
    name: "Nana Adjei",
    email: "nana@demo.madetom.app",
    phone: "+233244123461",
    roleKey: "cashier",
    branchId: osuBranchId,
    tokenHash: hash("demo-invitation-not-usable"),
    status: "pending",
    deliveryStatus: "sent",
    expiresAt: new Date(now.getTime() + 5 * 86400000),
    lastSentAt: new Date(now.getTime() - 2 * 86400000),
    sendCount: 1,
    createdBy: ownerId,
  });

  await db.insert(auditLogs).values([
    {
      id: id(),
      tenantId,
      actorUserId: ownerId,
      actorName: "Ama Mensah",
      action: "org.setup_completed",
      entityType: "tenant",
      entityId: tenantId,
      summary: "Completed business setup and opened the Adabraka Shop",
      createdAt: new Date(now.getTime() - 30 * 86400000),
    },
    {
      id: id(),
      tenantId,
      actorUserId: ownerId,
      actorName: "Ama Mensah",
      action: "staff.invited",
      entityType: "invitation",
      entityId: invitationId,
      summary: "Invited Nana Adjei as Cashier",
      createdAt: new Date(now.getTime() - 2 * 86400000),
    },
    {
      id: id(),
      tenantId,
      actorUserId: managerId,
      actorName: "Kofi Boateng",
      action: "purchase.received",
      entityType: "purchase",
      entityId: purchasesByBranch[0].id,
      summary: "Received opening stock purchase PO-00001",
      createdAt: new Date(now.getTime() - 22 * 86400000),
    },
  ]);

  console.log("✓ Demo workspace created");
  console.log("  Owner:   owner@demo.madetom.app / Madetom@2026!");
  console.log("  Manager: manager@demo.madetom.app / Madetom@2026!");
  console.log("  Cashier: cashier@demo.madetom.app / Madetom@2026!");
  console.log("  Inventory: inventory@demo.madetom.app / Madetom@2026!");
}

async function main() {
  console.log("Seeding Madetom…");
  await seedSystem();
  if (withDemo) await seedDemo();
  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
