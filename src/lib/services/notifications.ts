import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  notifications,
  notificationPreferences,
  productStock,
  products,
  productVariants,
  sales,
  smsLogs,
  tenantMemberships,
  tenants,
  users,
  variantStock,
} from "@/lib/db/schema";
import { sendSms } from "./sms";
import { formatMoney, formatNumber } from "@/lib/format";
import { startOfDay } from "date-fns";
import { subDays } from "date-fns";

export type StockRef = {
  tenantId: string;
  branchId: string;
  productId: string;
  variantId?: string | null;
  actorId: string;
};

type StockLevel = "ok" | "low" | "out";

function levelFor(quantity: number, reorderLevel: number): StockLevel {
  if (quantity <= 0) return "out";
  if (quantity <= reorderLevel) return "low";
  return "ok";
}

async function ownerContact(tenantId: string) {
  const [row] = await db
    .select({
      user: users,
      membership: tenantMemberships,
      preferences: notificationPreferences,
    })
    .from(tenantMemberships)
    .innerJoin(users, eq(users.id, tenantMemberships.userId))
    .leftJoin(
      notificationPreferences,
      and(
        eq(notificationPreferences.userId, tenantMemberships.userId),
        eq(notificationPreferences.tenantId, tenantMemberships.tenantId),
      ),
    )
    .where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.roleKey, "owner")))
    .limit(1);
  return row ?? null;
}

export async function createNotification(input: {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  level?: "info" | "warning" | "critical" | "success";
  entityType?: string;
  entityId?: string;
  conditionKey?: string;
}) {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    level: input.level ?? "info",
    entityType: input.entityType,
    entityId: input.entityId,
    conditionKey: input.conditionKey,
  });
}

/**
 * Re-evaluate a stock line and keep exactly one unresolved low/out alert per
 * product + branch condition. Resolves the alert when stock recovers.
 */
export async function syncStockLevel(ref: StockRef): Promise<void> {
  const owner = await ownerContact(ref.tenantId);
  if (!owner) return;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, ref.tenantId)).limit(1);
  const [branch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.id, ref.branchId), eq(branches.tenantId, ref.tenantId)))
    .limit(1);
  if (!tenant || !branch) return;

  const conditionKey = `stock:${ref.branchId}:${ref.productId}:${ref.variantId ?? "base"}`;

  const stockRow = ref.variantId
    ? (
        await db
          .select({
            quantity: variantStock.quantity,
            reorderLevel: variantStock.reorderLevel,
            productName: products.name,
            variantName: productVariants.name,
            trackInventory: products.trackInventory,
          })
          .from(variantStock)
          .innerJoin(products, eq(products.id, variantStock.productId))
          .innerJoin(productVariants, eq(productVariants.id, variantStock.variantId))
          .where(
            and(
              eq(variantStock.variantId, ref.variantId),
              eq(variantStock.branchId, ref.branchId),
              eq(variantStock.tenantId, ref.tenantId),
            ),
          )
          .limit(1)
      )[0]
    : (
        await db
          .select({
            quantity: productStock.quantity,
            reorderLevel: productStock.reorderLevel,
            productName: products.name,
            variantName: sql<string | null>`NULL`,
            trackInventory: products.trackInventory,
          })
          .from(productStock)
          .innerJoin(products, eq(products.id, productStock.productId))
          .where(
            and(
              eq(productStock.productId, ref.productId),
              eq(productStock.branchId, ref.branchId),
              eq(productStock.tenantId, ref.tenantId),
            ),
          )
          .limit(1)
      )[0];

  if (!stockRow || !stockRow.trackInventory) return;

  const level = levelFor(stockRow.quantity, stockRow.reorderLevel);
  const displayName = stockRow.variantName
    ? `${stockRow.productName} (${stockRow.variantName})`
    : stockRow.productName;

  if (level === "ok") {
    await db
      .update(notifications)
      .set({ resolvedAt: new Date() })
      .where(
        and(
          eq(notifications.tenantId, ref.tenantId),
          eq(notifications.conditionKey, conditionKey),
          isNull(notifications.resolvedAt),
        ),
      );
    return;
  }

  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, ref.tenantId),
        eq(notifications.conditionKey, conditionKey),
        isNull(notifications.resolvedAt),
      ),
    )
    .limit(1);

  if (existing) return;

  const isOut = level === "out";
  const title = isOut ? `Out of stock: ${displayName}` : `Low stock: ${displayName}`;
  const body = isOut
    ? `${displayName} has run out at ${branch.name}. Record a purchase or adjust stock to replenish it.`
    : `${displayName} is down to ${formatNumber(stockRow.quantity)} ${stockRow.quantity === 1 ? "unit" : "units"} at ${branch.name}. Reorder level is ${stockRow.reorderLevel}.`;

  await createNotification({
    tenantId: ref.tenantId,
    userId: owner.user.id,
    type: isOut ? "out_of_stock" : "low_stock",
    title,
    body,
    level: isOut ? "critical" : "warning",
    entityType: "product",
    entityId: ref.productId,
    conditionKey,
  });

  const preferences = owner.preferences;
  const smsEnabled = isOut ? preferences?.smsOutOfStock : preferences?.smsLowStock;
  const inAppEnabled = isOut ? preferences?.outOfStock !== false : preferences?.lowStock !== false;
  if (!inAppEnabled) return;
  if (!smsEnabled || !owner.user.phone) return;

  const message = isOut
    ? `Madetom · ${tenant.name}: ${displayName} is out of stock at ${branch.name}. Replenish to keep selling.`
    : `Madetom · ${tenant.name}: ${displayName} is low (${stockRow.quantity} left) at ${branch.name}. Reorder level ${stockRow.reorderLevel}.`;

  await sendSms({
    tenantId: ref.tenantId,
    phone: owner.user.phone,
    message: message.slice(0, 320),
    purpose: isOut ? "out_of_stock" : "low_stock",
    relatedType: "product",
    relatedId: ref.productId,
    createdBy: ref.actorId,
  });
}

export async function syncStockLevels(refs: StockRef[]): Promise<void> {
  const unique = new Map<string, StockRef>();
  for (const ref of refs) {
    unique.set(`${ref.branchId}:${ref.productId}:${ref.variantId ?? "base"}`, ref);
  }
  for (const ref of unique.values()) {
    try {
      await syncStockLevel(ref);
    } catch (error) {
      console.error("stock_alert_failed", error);
    }
  }
}

export async function notifyStockAdjustment(input: {
  tenantId: string;
  tenantName: string;
  branchId: string;
  productId: string;
  variantId?: string | null;
  description: string;
  actorId: string;
}) {
  const owner = await ownerContact(input.tenantId);
  if (!owner) return;
  if (owner.preferences?.stockAdjustments === false) return;
  await createNotification({
    tenantId: input.tenantId,
    userId: owner.user.id,
    type: "stock_adjustment",
    title: "Stock adjusted",
    body: input.description,
    level: "info",
    entityType: "product",
    entityId: input.productId,
  });

  if (!owner.preferences?.smsStockAdjustment || !owner.user.phone) return;
  try {
    await sendSms({
      tenantId: input.tenantId,
      phone: owner.user.phone,
      message: `Madetom · ${input.tenantName}: ${input.description}`.slice(0, 320),
      purpose: "stock_adjustment",
      relatedType: "product",
      relatedId: input.productId,
      createdBy: input.actorId,
    });
  } catch (error) {
    // Inventory has already changed. An SMS failure must not surface as an
    // adjustment failure or make the user repeat the operation.
    console.error("stock_adjustment_sms_failed", error);
  }
}

export async function markNotificationsRead(input: { tenantId: string; userId: string; ids?: string[] }) {
  const conditions = [
    eq(notifications.tenantId, input.tenantId),
    eq(notifications.userId, input.userId),
    isNull(notifications.readAt),
  ];
  if (input.ids?.length) {
    conditions.push(sql`${notifications.id} IN (${sql.join(input.ids.map((id) => sql`${id}`), sql`, `)})`);
  }
  await db.update(notifications).set({ readAt: new Date() }).where(and(...conditions));
}

/** Daily summary for every active tenant. Invoked by the protected cron route. */
export async function runDailySummaries(): Promise<{ tenants: number; notified: number }> {
  const activeTenants = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.status, "active"), sql`${tenants.onboardingCompletedAt} IS NOT NULL`));

  const yesterdayStart = startOfDay(subDays(new Date(), 1));
  const yesterdayEnd = startOfDay(new Date());
  const dateLabel = yesterdayStart.toISOString().slice(0, 10);
  let notified = 0;

  for (const tenant of activeTenants) {
    try {
      const owner = await ownerContact(tenant.id);
      if (!owner) continue;
      if (owner.preferences?.dailySummary === false) continue;

      const [existing] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.tenantId, tenant.id),
            eq(notifications.type, "daily_summary"),
            eq(notifications.entityId, dateLabel),
          ),
        )
        .limit(1);
      if (existing) continue;

      const [totals] = await db
        .select({
          revenue: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.tenantId, tenant.id),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${yesterdayStart}`,
            sql`${sales.createdAt} < ${yesterdayEnd}`,
          ),
        );

      const revenue = Number(totals?.revenue ?? 0);
      const count = Number(totals?.count ?? 0);
      const appUrl = process.env.APP_URL ?? "https://madetom.vercel.app";
      const reportLink = `${appUrl}/app/reports`;
      const body =
        `Madetom Daily Sales Summary — ${dateLabel}\n` +
        `Shop: ${tenant.name}\n` +
        `Revenue: ${formatMoney(revenue, tenant.currency)}\n` +
        `Transactions: ${formatNumber(count)}\n` +
        `View full report: ${reportLink}`;

      await createNotification({
        tenantId: tenant.id,
        userId: owner.user.id,
        type: "daily_summary",
        title: "Yesterday's sales summary",
        body,
        level: "info",
        entityType: "report",
        entityId: dateLabel,
      });
      notified += 1;

      if (owner.preferences?.smsDailySummary && owner.user.phone) {
        await sendSms({
          tenantId: tenant.id,
          phone: owner.user.phone,
          message: body.slice(0, 320),
          purpose: "daily_summary",
          relatedType: "report",
          relatedId: dateLabel,
          createdBy: owner.user.id,
        });
      }
    } catch (error) {
      console.error("daily_summary_failed", tenant.id, error);
    }
  }

  return { tenants: activeTenants.length, notified };
}

/**
 * Daily platform health report sent to the super admin.
 * Aggregates tenant counts, SMS usage, and recent activity across the platform.
 */
export async function runPlatformDailyReport(): Promise<{
  tenants: number;
  activeTenants: number;
  smsSentToday: number;
  smsFailedToday: number;
  superAdminNotified: boolean;
}> {
  const yesterdayStart = startOfDay(subDays(new Date(), 1));
  const todayStart = startOfDay(new Date());

  const [tenantCounts] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      active: sql<number>`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`,
    })
    .from(tenants);

  const [smsCounts] = await db
    .select({
      sent: sql<number>`SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)`,
      failed: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
    })
    .from(smsLogs)
    .where(sql`${smsLogs.createdAt} >= ${yesterdayStart} AND ${smsLogs.createdAt} < ${todayStart}`);

  const totalTenants = Number(tenantCounts?.total ?? 0);
  const activeTenants = Number(tenantCounts?.active ?? 0);
  const smsSent = Number(smsCounts?.sent ?? 0);
  const smsFailed = Number(smsCounts?.failed ?? 0);

  const appUrl = process.env.APP_URL ?? "https://madetom.vercel.app";
  const reportLink = `${appUrl}/admin/platform-report`;
  const body =
    `Madetom Platform Daily Report — ${todayStart.toISOString().slice(0, 10)}\n` +
    `Workspaces: ${activeTenants} active / ${totalTenants} total\n` +
    `SMS sent: ${smsSent}\n` +
    `SMS failed: ${smsFailed}\n` +
    `View full report: ${reportLink}`;

  let superAdminNotified = false;
  try {
    const [superAdmin] = await db
      .select({ id: users.id, phone: users.phone, name: users.name })
      .from(users)
      .where(eq(users.isSuperAdmin, true))
      .limit(1);

    if (superAdmin?.phone) {
      await sendSms({
        tenantId: null,
        phone: superAdmin.phone,
        message: body.slice(0, 320),
        purpose: "platform_report",
        createdBy: superAdmin.id,
        deductCredit: false,
      });
      superAdminNotified = true;
    }
  } catch (error) {
    console.error("platform_daily_report_failed", error);
  }

  return {
    tenants: totalTenants,
    activeTenants,
    smsSentToday: smsSent,
    smsFailedToday: smsFailed,
    superAdminNotified,
  };
}

