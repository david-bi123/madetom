"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationPreferences, notifications } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { type ActionState } from "@/lib/action-state";

export async function markNotificationRead(formData: FormData): Promise<void> {
  const context = await requireBusiness("notifications.view");
  const notificationId = formData.get("id");
  if (typeof notificationId !== "string" || !notificationId) return;

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.tenantId, context.tenant.id),
        or(eq(notifications.userId, context.user.id), isNull(notifications.userId)),
      ),
    );

  revalidatePath("/app/notifications");
}

export async function markAllNotificationsRead(): Promise<void> {
  const context = await requireBusiness("notifications.view");

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.tenantId, context.tenant.id),
        or(eq(notifications.userId, context.user.id), isNull(notifications.userId)),
        isNull(notifications.readAt),
      ),
    );

  revalidatePath("/app/notifications");
}

type PreferenceKey =
  | "lowStock"
  | "outOfStock"
  | "dailySummary"
  | "stockAdjustments"
  | "smsLowStock"
  | "smsOutOfStock"
  | "smsDailySummary"
  | "smsStockAdjustment";

export async function updateNotificationPreferences(
  state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireBusiness("notifications.view");

  const values: Record<PreferenceKey, boolean> = {
    lowStock: formData.get("lowStock") === "true",
    outOfStock: formData.get("outOfStock") === "true",
    dailySummary: formData.get("dailySummary") === "true",
    stockAdjustments: formData.get("stockAdjustments") === "true",
    smsLowStock: formData.get("smsLowStock") === "true",
    smsOutOfStock: formData.get("smsOutOfStock") === "true",
    smsDailySummary: formData.get("smsDailySummary") === "true",
    smsStockAdjustment: formData.get("smsStockAdjustment") === "true",
  };

  const [existing] = await db
    .select({ id: notificationPreferences.id })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.tenantId, context.tenant.id),
        eq(notificationPreferences.userId, context.user.id),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(notificationPreferences)
      .set(values)
      .where(eq(notificationPreferences.id, existing.id));
  } else {
    await db.insert(notificationPreferences).values({
      id: crypto.randomUUID(),
      tenantId: context.tenant.id,
      userId: context.user.id,
      ...values,
    });
  }

  revalidatePath("/app/notifications");
  return { success: "Notification preferences saved." };
}
