import {
  boolean,
  date,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const id = () => varchar("id", { length: 36 }).primaryKey();
const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* -------------------------------------------------------------------------- */
/* Platform & accounts                                                         */
/* -------------------------------------------------------------------------- */

export const tenants = mysqlTable(
  "tenants",
  {
    id: id(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    businessType: varchar("business_type", { length: 80 }).notNull(),
    country: varchar("country", { length: 80 }).notNull().default("Ghana"),
    region: varchar("region", { length: 80 }),
    location: varchar("location", { length: 255 }),
    phone: varchar("phone", { length: 40 }),
    email: varchar("email", { length: 160 }),
    logoUrl: text("logo_url"),
    currency: varchar("currency", { length: 3 }).notNull().default("GHS"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Africa/Accra"),
    taxRate: decimal("tax_rate", { precision: 6, scale: 3 }).notNull().default("0.000"),
    pricesIncludeTax: boolean("prices_include_tax").notNull().default(true),
    allowPartialPayments: boolean("allow_partial_payments").notNull().default(true),
    status: mysqlEnum("status", ["pending", "active", "suspended"]).notNull().default("pending"),
    // True when the organisation is billed by the platform team. Exempt
    // organisations cannot start an online Paystack payment.
    paymentExempt: boolean("payment_exempt").notNull().default(false),
    onboardingCompletedAt: timestamp("onboarding_completed_at"),
    suspendedReason: text("suspended_reason"),
    createdBy: varchar("created_by", { length: 36 }),
    ...timestamps,
  },
  (t) => [uniqueIndex("tenants_slug_uq").on(t.slug), index("tenants_status_idx").on(t.status)],
);

export const users = mysqlTable(
  "users",
  {
    id: id(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    isSuperAdmin: boolean("is_super_admin").notNull().default(false),
    status: mysqlEnum("status", ["invited", "active", "suspended"]).notNull().default("invited"),
    lastLoginAt: timestamp("last_login_at"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), index("users_super_idx").on(t.isSuperAdmin)],
);

export const roles = mysqlTable("roles", {
  key: varchar("key", { length: 40 }).primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  description: varchar("description", { length: 255 }),
});

export const permissions = mysqlTable("permissions", {
  key: varchar("key", { length: 80 }).primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  groupName: varchar("group_name", { length: 60 }).notNull(),
  sensitive: boolean("sensitive").notNull().default(false),
});

export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    roleKey: varchar("role_key", { length: 40 })
      .notNull()
      .references(() => roles.key, { onDelete: "cascade" }),
    permissionKey: varchar("permission_key", { length: 80 })
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleKey, t.permissionKey] })],
);

export const branches = mysqlTable(
  "branches",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 16 }).notNull(),
    address: varchar("address", { length: 255 }),
    phone: varchar("phone", { length: 40 }),
    isDefault: boolean("is_default").notNull().default(false),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("branches_tenant_code_uq").on(t.tenantId, t.code),
    index("branches_tenant_idx").on(t.tenantId),
    index("branches_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

export const tenantMemberships = mysqlTable(
  "tenant_memberships",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleKey: varchar("role_key", { length: 40 })
      .notNull()
      .references(() => roles.key),
    defaultBranchId: varchar("default_branch_id", { length: 36 }).references(() => branches.id, {
      onDelete: "set null",
    }),
    status: mysqlEnum("status", ["active", "suspended"]).notNull().default("active"),
    permissionsOverride: json("permissions_override").$type<{
      grant: string[];
      revoke: string[];
    }>(),
    invitedBy: varchar("invited_by", { length: 36 }),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("memberships_tenant_user_uq").on(t.tenantId, t.userId),
    index("memberships_user_idx").on(t.userId),
    index("memberships_tenant_idx").on(t.tenantId),
    index("memberships_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: id(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 255 }),
    expiresAt: timestamp("expires_at").notNull(),
    lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_uq").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
    index("sessions_expiry_idx").on(t.expiresAt),
  ],
);

export const invitations = mysqlTable(
  "invitations",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["owner", "staff"]).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 160 }),
    phone: varchar("phone", { length: 40 }).notNull(),
    roleKey: varchar("role_key", { length: 40 }).notNull(),
    branchId: varchar("branch_id", { length: 36 }).references(() => branches.id, {
      onDelete: "set null",
    }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"]).notNull().default("pending"),
    deliveryStatus: mysqlEnum("delivery_status", ["pending", "sent", "failed"]).notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    lastSentAt: timestamp("last_sent_at"),
    sendCount: int("send_count").notNull().default(0),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdBy: varchar("created_by", { length: 36 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("invitations_token_uq").on(t.tokenHash),
    index("invitations_tenant_idx").on(t.tenantId, t.status),
    index("invitations_status_idx").on(t.status),
    index("invitations_tenant_type_status_idx").on(t.tenantId, t.type, t.status),
  ],
);

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: id(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attempts: int("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("password_reset_user_idx").on(t.userId)],
);

export const rateLimits = mysqlTable("rate_limits", {
  key: varchar("key", { length: 191 }).primaryKey(),
  count: int("count").notNull().default(0),
  windowStart: timestamp("window_start").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

/* -------------------------------------------------------------------------- */
/* Catalogue & trading partners                                               */
/* -------------------------------------------------------------------------- */

export const productCategories = mysqlTable(
  "product_categories",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    description: varchar("description", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("categories_tenant_name_uq").on(t.tenantId, t.name),
    index("categories_tenant_idx").on(t.tenantId),
  ],
);

export const suppliers = mysqlTable(
  "suppliers",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    contactName: varchar("contact_name", { length: 120 }),
    phone: varchar("phone", { length: 40 }),
    email: varchar("email", { length: 160 }),
    address: varchar("address", { length: 255 }),
    notes: text("notes"),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    ...timestamps,
  },
  (t) => [index("suppliers_tenant_idx").on(t.tenantId)],
);

export const customers = mysqlTable(
  "customers",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    email: varchar("email", { length: 160 }),
    address: varchar("address", { length: 255 }),
    notes: text("notes"),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    ...timestamps,
  },
  (t) => [index("customers_tenant_idx").on(t.tenantId), index("customers_phone_idx").on(t.tenantId, t.phone)],
);

export const products = mysqlTable(
  "products",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    categoryId: varchar("category_id", { length: 36 }).references(() => productCategories.id, {
      onDelete: "set null",
    }),
    supplierId: varchar("supplier_id", { length: 36 }).references(() => suppliers.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 160 }).notNull(),
    sku: varchar("sku", { length: 64 }).notNull(),
    barcode: varchar("barcode", { length: 64 }),
    description: text("description"),
    imageUrl: text("image_url"),
    imagePublicId: varchar("image_public_id", { length: 120 }),
    costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
    sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
    reorderLevel: int("reorder_level").notNull().default(5),
    unit: varchar("unit", { length: 24 }).notNull().default("piece"),
    taxRate: decimal("tax_rate", { precision: 6, scale: 3 }),
    hasVariants: boolean("has_variants").notNull().default(false),
    trackInventory: boolean("track_inventory").notNull().default(true),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_tenant_sku_uq").on(t.tenantId, t.sku),
    index("products_tenant_status_idx").on(t.tenantId, t.status),
    index("products_tenant_barcode_idx").on(t.tenantId, t.barcode),
    index("products_category_idx").on(t.categoryId),
  ],
);

export const productVariants = mysqlTable(
  "product_variants",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    sku: varchar("sku", { length: 64 }).notNull(),
    barcode: varchar("barcode", { length: 64 }),
    attributes: json("attributes").$type<Record<string, string>>(),
    costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull(),
    sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }).notNull(),
    reorderLevel: int("reorder_level").notNull().default(5),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("variants_tenant_sku_uq").on(t.tenantId, t.sku),
    index("variants_product_idx").on(t.productId),
  ],
);

export const productStock = mysqlTable(
  "product_stock",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    branchId: varchar("branch_id", { length: 36 })
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    quantity: int("quantity").notNull().default(0),
    reorderLevel: int("reorder_level").notNull().default(5),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("stock_product_branch_uq").on(t.productId, t.branchId),
    index("stock_tenant_branch_idx").on(t.tenantId, t.branchId),
  ],
);

export const variantStock = mysqlTable(
  "variant_stock",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    variantId: varchar("variant_id", { length: 36 })
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 }).notNull(),
    branchId: varchar("branch_id", { length: 36 })
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    quantity: int("quantity").notNull().default(0),
    reorderLevel: int("reorder_level").notNull().default(5),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("vstock_variant_branch_uq").on(t.variantId, t.branchId),
    index("vstock_tenant_branch_idx").on(t.tenantId, t.branchId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Purchasing                                                                  */
/* -------------------------------------------------------------------------- */

export const purchases = mysqlTable(
  "purchases",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: varchar("branch_id", { length: 36 })
      .notNull()
      .references(() => branches.id),
    supplierId: varchar("supplier_id", { length: 36 })
      .notNull()
      .references(() => suppliers.id),
    reference: varchar("reference", { length: 40 }).notNull(),
    status: mysqlEnum("status", ["draft", "received", "cancelled"]).notNull().default("draft"),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0.00"),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0.00"),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0.00"),
    notes: text("notes"),
    receivedAt: timestamp("received_at"),
    receivedBy: varchar("received_by", { length: 36 }),
    createdBy: varchar("created_by", { length: 36 }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("purchases_tenant_ref_uq").on(t.tenantId, t.reference),
    index("purchases_tenant_idx").on(t.tenantId, t.createdAt),
    index("purchases_supplier_idx").on(t.supplierId),
  ],
);

export const purchaseItems = mysqlTable(
  "purchase_items",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 }).notNull(),
    purchaseId: varchar("purchase_id", { length: 36 })
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 }).notNull(),
    variantId: varchar("variant_id", { length: 36 }),
    nameSnapshot: varchar("name_snapshot", { length: 180 }).notNull(),
    quantity: int("quantity").notNull(),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
    lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [index("purchase_items_purchase_idx").on(t.purchaseId)],
);

/* -------------------------------------------------------------------------- */
/* Selling                                                                     */
/* -------------------------------------------------------------------------- */

export const sales = mysqlTable(
  "sales",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: varchar("branch_id", { length: 36 })
      .notNull()
      .references(() => branches.id),
    receiptNumber: varchar("receipt_number", { length: 40 }).notNull(),
    customerId: varchar("customer_id", { length: 36 }).references(() => customers.id, {
      onDelete: "set null",
    }),
    cashierId: varchar("cashier_id", { length: 36 }).notNull(),
    status: mysqlEnum("status", ["completed", "refunded"]).notNull().default("completed"),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull(),
    changeDue: decimal("change_due", { precision: 12, scale: 2 }).notNull().default("0.00"),
    paymentStatus: mysqlEnum("payment_status", ["paid", "partial"]).notNull().default("paid"),
    notes: text("notes"),
    refundedAt: timestamp("refunded_at"),
    refundedBy: varchar("refunded_by", { length: 36 }),
    refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("sales_tenant_receipt_uq").on(t.tenantId, t.receiptNumber),
    index("sales_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("sales_branch_created_idx").on(t.branchId, t.createdAt),
    index("sales_customer_idx").on(t.customerId),
  ],
);

export const saleItems = mysqlTable(
  "sale_items",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 }).notNull(),
    saleId: varchar("sale_id", { length: 36 })
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 }).notNull(),
    variantId: varchar("variant_id", { length: 36 }),
    nameSnapshot: varchar("name_snapshot", { length: 180 }).notNull(),
    skuSnapshot: varchar("sku_snapshot", { length: 64 }),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
    quantity: int("quantity").notNull(),
    discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [
    index("sale_items_sale_idx").on(t.saleId),
    index("sale_items_product_idx").on(t.productId),
  ],
);

export const payments = mysqlTable(
  "payments",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    saleId: varchar("sale_id", { length: 36 }).references(() => sales.id, { onDelete: "cascade" }),
    purchaseId: varchar("purchase_id", { length: 36 }).references(() => purchases.id, {
      onDelete: "cascade",
    }),
    method: mysqlEnum("method", ["cash", "momo", "bank", "card", "credit"]).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    reference: varchar("reference", { length: 120 }),
    note: varchar("note", { length: 255 }),
    createdBy: varchar("created_by", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("payments_sale_idx").on(t.saleId),
    index("payments_purchase_idx").on(t.purchaseId),
    index("payments_tenant_created_idx").on(t.tenantId, t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Expenses                                                                    */
/* -------------------------------------------------------------------------- */

export const expenses = mysqlTable(
  "expenses",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: varchar("branch_id", { length: 36 })
      .notNull()
      .references(() => branches.id),
    category: varchar("category", { length: 80 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    expenseDate: date("expense_date", { mode: "string" }).notNull(),
    paymentMethod: mysqlEnum("payment_method", ["cash", "momo", "bank", "card", "other"]).notNull().default("cash"),
    reference: varchar("reference", { length: 120 }),
    createdBy: varchar("created_by", { length: 36 }).notNull(),
    ...timestamps,
  },
  (t) => [index("expenses_tenant_date_idx").on(t.tenantId, t.expenseDate)],
);

/* -------------------------------------------------------------------------- */
/* Inventory ledger                                                            */
/* -------------------------------------------------------------------------- */

export const stockMovements = mysqlTable(
  "stock_movements",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: varchar("branch_id", { length: 36 })
      .notNull()
      .references(() => branches.id),
    productId: varchar("product_id", { length: 36 }).notNull(),
    variantId: varchar("variant_id", { length: 36 }),
    type: mysqlEnum("type", [
      "sale",
      "refund",
      "purchase",
      "adjustment",
      "transfer_in",
      "transfer_out",
      "initial",
      "import",
    ]).notNull(),
    quantityDelta: int("quantity_delta").notNull(),
    balanceAfter: int("balance_after").notNull(),
    referenceType: varchar("reference_type", { length: 40 }),
    referenceId: varchar("reference_id", { length: 36 }),
    referenceLabel: varchar("reference_label", { length: 64 }),
    note: varchar("note", { length: 255 }),
    createdBy: varchar("created_by", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("movements_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("movements_product_idx").on(t.productId),
    index("movements_branch_idx").on(t.branchId),
  ],
);

export const stockAdjustments = mysqlTable(
  "stock_adjustments",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: varchar("branch_id", { length: 36 }).notNull(),
    productId: varchar("product_id", { length: 36 }).notNull(),
    variantId: varchar("variant_id", { length: 36 }),
    reference: varchar("reference", { length: 40 }).notNull(),
    type: mysqlEnum("type", ["increase", "decrease", "set"]).notNull(),
    quantityBefore: int("quantity_before").notNull(),
    quantityAfter: int("quantity_after").notNull(),
    reason: varchar("reason", { length: 120 }).notNull(),
    notes: varchar("notes", { length: 255 }),
    createdBy: varchar("created_by", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("adjustments_tenant_idx").on(t.tenantId, t.createdAt)],
);

export const stockTransfers = mysqlTable(
  "stock_transfers",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    fromBranchId: varchar("from_branch_id", { length: 36 }).notNull(),
    toBranchId: varchar("to_branch_id", { length: 36 }).notNull(),
    productId: varchar("product_id", { length: 36 }).notNull(),
    variantId: varchar("variant_id", { length: 36 }),
    reference: varchar("reference", { length: 40 }).notNull(),
    quantity: int("quantity").notNull(),
    notes: varchar("notes", { length: 255 }),
    createdBy: varchar("created_by", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("transfers_tenant_idx").on(t.tenantId, t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* Notifications & SMS                                                         */
/* -------------------------------------------------------------------------- */

export const notifications = mysqlTable(
  "notifications",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 60 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body").notNull(),
    level: mysqlEnum("level", ["info", "warning", "critical", "success"]).notNull().default("info"),
    entityType: varchar("entity_type", { length: 40 }),
    entityId: varchar("entity_id", { length: 36 }),
    conditionKey: varchar("condition_key", { length: 120 }),
    readAt: timestamp("read_at"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("notifications_tenant_idx").on(t.tenantId, t.createdAt),
    index("notifications_condition_idx").on(t.tenantId, t.conditionKey),
  ],
);

export const notificationPreferences = mysqlTable(
  "notification_preferences",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lowStock: boolean("low_stock").notNull().default(true),
    outOfStock: boolean("out_of_stock").notNull().default(true),
    dailySummary: boolean("daily_summary").notNull().default(false),
    stockAdjustments: boolean("stock_adjustments").notNull().default(true),
    smsLowStock: boolean("sms_low_stock").notNull().default(true),
    smsOutOfStock: boolean("sms_out_of_stock").notNull().default(true),
    smsDailySummary: boolean("sms_daily_summary").notNull().default(true),
    smsStockAdjustment: boolean("sms_stock_adjustment").notNull().default(true),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("notification_prefs_user_uq").on(t.tenantId, t.userId)],
);

export const smsWallets = mysqlTable(
  "sms_wallets",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    credits: int("credits").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("sms_wallets_tenant_uq").on(t.tenantId)],
);

export const smsTransactions = mysqlTable(
  "sms_transactions",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["credit", "debit"]).notNull(),
    credits: int("credits").notNull(),
    balanceAfter: int("balance_after").notNull(),
    reference: varchar("reference", { length: 120 }),
    description: varchar("description", { length: 255 }).notNull(),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sms_tx_tenant_idx").on(t.tenantId, t.createdAt)],
);

export const smsLogs = mysqlTable(
  "sms_logs",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 }).references(() => tenants.id, {
      onDelete: "cascade",
    }),
    phone: varchar("phone", { length: 40 }).notNull(),
    message: text("message").notNull(),
    purpose: varchar("purpose", { length: 60 }).notNull(),
    provider: varchar("provider", { length: 40 }).notNull(),
    status: mysqlEnum("status", ["queued", "sent", "failed"]).notNull().default("queued"),
    providerMessageId: varchar("provider_message_id", { length: 120 }),
    error: varchar("error", { length: 255 }),
    creditsUsed: int("credits_used").notNull().default(0),
    relatedType: varchar("related_type", { length: 40 }),
    relatedId: varchar("related_id", { length: 36 }),
    attempts: int("attempts").notNull().default(1),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("sms_logs_tenant_idx").on(t.tenantId, t.createdAt),
    index("sms_logs_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/* Subscriptions                                                               */
/* -------------------------------------------------------------------------- */

export const subscriptionPlans = mysqlTable("subscription_plans", {
  key: varchar("key", { length: 40 }).primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  description: varchar("description", { length: 255 }),
  priceMonthly: decimal("price_monthly", { precision: 12, scale: 2 }).notNull().default("0.00"),
  priceYearly: decimal("price_yearly", { precision: 12, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("GHS"),
  maxEmployees: int("max_employees").notNull(),
  maxBranches: int("max_branches").notNull(),
  // null means unlimited products.
  maxProducts: int("max_products"),
  maxTransactionsPerMonth: int("max_transactions_per_month").notNull(),
  smsCredits: int("sms_credits").notNull().default(0),
  features: json("features").$type<
    Array<{ key: string; label: string; group: string; description: string }>
  >(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    planKey: varchar("plan_key", { length: 40 })
      .notNull()
      .references(() => subscriptionPlans.key),
    status: mysqlEnum("status", [
      "trial",
      "active",
      "pending_payment",
      "past_due",
      "suspended",
      "expired",
      "cancelled",
    ])
      .notNull()
      .default("active"),
    billingCycle: mysqlEnum("billing_cycle", ["monthly", "yearly"]).notNull().default("monthly"),
    // Amount charged for the current billing period, in major units (GHS).
    billingAmount: decimal("billing_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    currency: varchar("currency", { length: 3 }).notNull().default("GHS"),
    paymentReference: varchar("payment_reference", { length: 120 }),
    trialEndsAt: timestamp("trial_ends_at"),
    currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
    currentPeriodEnd: timestamp("current_period_end"),
    suspendedAt: timestamp("suspended_at"),
    cancelledAt: timestamp("cancelled_at"),
    notes: varchar("notes", { length: 255 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("subscriptions_tenant_uq").on(t.tenantId),
    index("subscriptions_status_idx").on(t.status),
    index("subscriptions_period_end_idx").on(t.currentPeriodEnd),
  ],
);

/**
 * Immutable audit trail of every plan/status change made to a subscription.
 */
export const subscriptionHistory = mysqlTable(
  "subscription_history",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    planKey: varchar("plan_key", { length: 40 }).notNull(),
    previousPlanKey: varchar("previous_plan_key", { length: 40 }),
    previousStatus: varchar("previous_status", { length: 20 }),
    status: varchar("status", { length: 20 }).notNull(),
    action: varchar("action", { length: 40 }).notNull(),
    billingAmount: decimal("billing_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    currency: varchar("currency", { length: 3 }).notNull().default("GHS"),
    effectiveAt: timestamp("effective_at").notNull().defaultNow(),
    periodEnd: timestamp("period_end"),
    actorUserId: varchar("actor_user_id", { length: 36 }),
    actorName: varchar("actor_name", { length: 120 }),
    notes: varchar("notes", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("subscription_history_tenant_idx").on(t.tenantId, t.createdAt),
    index("subscription_history_plan_idx").on(t.planKey),
  ],
);

/**
 * Server-verified Paystack payment records. The unique reference is the
 * idempotency key used by the webhook and the verification callback.
 */
export const subscriptionPayments = mysqlTable(
  "subscription_payments",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    subscriptionId: varchar("subscription_id", { length: 36 }),
    planKey: varchar("plan_key", { length: 40 }).notNull(),
    provider: varchar("provider", { length: 30 }).notNull().default("paystack"),
    reference: varchar("reference", { length: 120 }).notNull(),
    providerReference: varchar("provider_reference", { length: 120 }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("GHS"),
    status: mysqlEnum("status", ["pending", "success", "failed", "abandoned"])
      .notNull()
      .default("pending"),
    paidAt: timestamp("paid_at"),
    failureReason: varchar("failure_reason", { length: 255 }),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("subscription_payments_reference_uq").on(t.reference),
    index("subscription_payments_tenant_idx").on(t.tenantId, t.createdAt),
    index("subscription_payments_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/* Audit, settings, sequences                                                  */
/* -------------------------------------------------------------------------- */

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 }).references(() => tenants.id, {
      onDelete: "set null",
    }),
    actorUserId: varchar("actor_user_id", { length: 36 }),
    actorName: varchar("actor_name", { length: 120 }).notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }),
    entityId: varchar("entity_id", { length: 36 }),
    summary: varchar("summary", { length: 255 }).notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_tenant_idx").on(t.tenantId, t.createdAt),
    index("audit_created_idx").on(t.createdAt),
  ],
);

export const platformSettings = mysqlTable("platform_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: json("value").$type<unknown>(),
  updatedBy: varchar("updated_by", { length: 36 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const documentSequences = mysqlTable(
  "document_sequences",
  {
    id: id(),
    tenantId: varchar("tenant_id", { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 60 }).notNull(),
    prefix: varchar("prefix", { length: 20 }).notNull(),
    nextNumber: int("next_number").notNull().default(1),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("doc_seq_tenant_key_uq").on(t.tenantId, t.key)],
);

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Membership = typeof tenantMemberships.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type SmsLog = typeof smsLogs.$inferSelect;
