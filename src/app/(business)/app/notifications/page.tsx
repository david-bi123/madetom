import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationPreferences, notifications, smsWallets } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { PageHeader, EmptyState, SectionHeading } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  NotificationPreferencesForm,
  type NotificationPreferences,
} from "@/components/notifications/notification-preferences-form";
import { Bell } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

const LEVEL_STYLES: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  critical: "bg-danger-soft text-destructive",
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  lowStock: true,
  outOfStock: true,
  dailySummary: true,
  stockAdjustments: true,
  smsLowStock: false,
  smsOutOfStock: false,
  smsDailySummary: false,
  smsStockAdjustment: false,
};

export default async function NotificationsPage() {
  const context = await requireBusiness("notifications.view");
  const tenantId = context.tenant.id;

  const [rows, preferenceRows, walletRows] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          or(eq(notifications.userId, context.user.id), isNull(notifications.userId)),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(60),
    db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.tenantId, tenantId),
          eq(notificationPreferences.userId, context.user.id),
        ),
      )
      .limit(1),
    db
      .select({ credits: smsWallets.credits })
      .from(smsWallets)
      .where(eq(smsWallets.tenantId, tenantId))
      .limit(1),
  ]);

  const unread = rows.filter((row) => !row.readAt && !row.resolvedAt);
  const preference = preferenceRows[0];
  const preferences: NotificationPreferences = preference
    ? {
        lowStock: preference.lowStock,
        outOfStock: preference.outOfStock,
        dailySummary: preference.dailySummary,
        stockAdjustments: preference.stockAdjustments,
        smsLowStock: preference.smsLowStock,
        smsOutOfStock: preference.smsOutOfStock,
        smsDailySummary: preference.smsDailySummary,
        smsStockAdjustment: preference.smsStockAdjustment,
      }
    : DEFAULT_PREFERENCES;
  const smsCredits = Number(walletRows[0]?.credits ?? 0);

  return (
    <div>
      <PageHeader
        eyebrow={context.activeBranch.name}
        title="Notifications"
        description="Stock alerts, team activity and daily summaries for this workspace."
        actions={
          unread.length > 0 ? (
            <form action={markAllNotificationsRead}>
              <Button variant="outline" size="sm" type="submit">
                Mark all read
              </Button>
            </form>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <EmptyState
            icon={Bell}
            title="Nothing to report"
            description="Low stock, expiring items and team activity will land here."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <ul className="divide-y divide-border/80">
            {rows.map((notification) => {
              const isUnread = !notification.readAt && !notification.resolvedAt;
              return (
                <li
                  key={notification.id}
                  className={isUnread ? "bg-[#fbfdf9] px-4 py-3.5" : "px-4 py-3.5"}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] uppercase ${LEVEL_STYLES[notification.level] ?? LEVEL_STYLES.info}`}
                    >
                      {notification.level}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-foreground">{notification.title}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDate(notification.createdAt, "datetime")}
                      </p>
                    </div>
                    {isUnread ? (
                      <form action={markNotificationRead}>
                        <input type="hidden" name="id" value={notification.id} />
                        <Button variant="ghost" size="sm" type="submit">
                          Mark read
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <section className="mt-6">
        <div className="mb-3">
          <SectionHeading
            title="Your preferences"
            description="Choose what Madetom tells you about, and how."
          />
        </div>
        <NotificationPreferencesForm values={preferences} smsCredits={smsCredits} />
      </section>
    </div>
  );
}
