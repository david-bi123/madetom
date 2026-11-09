import { and, count, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, smsWallets } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { ROLE_CATALOG } from "@/lib/permissions";
import { getPlatformSettings } from "@/lib/platform-settings";
import { AppShell } from "@/components/app/app-shell";

/**
 * Every workspace screen reads the session cookie and the tenant's data at
 * request time, so the shell cannot be prerendered into a static shell.
 */

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const context = await requireBusiness();

  const [unreadResult, walletResult, platform] = await Promise.all([
    db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, context.tenant.id),
          or(
            eq(notifications.userId, context.user.id),
            isNull(notifications.userId),
          ),
          isNull(notifications.readAt),
          isNull(notifications.resolvedAt),
        ),
      ),
    db
      .select({ credits: smsWallets.credits })
      .from(smsWallets)
      .where(eq(smsWallets.tenantId, context.tenant.id))
      .limit(1),
    getPlatformSettings(),
  ]);

  const unread = Number(unreadResult[0]?.value ?? 0);
  const wallet = Number(walletResult[0]?.credits ?? 0);

  return (
    <AppShell
      user={{ name: context.user.name, email: context.user.email }}
      tenant={{ name: context.tenant.name, slug: context.tenant.slug }}
      roleKey={context.roleKey}
      roleName={ROLE_CATALOG[context.roleKey].name}
      permissions={[...context.permissions]}
      branches={context.branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        isDefault: branch.isDefault,
      }))}
      activeBranchId={context.activeBranch.id}
      canViewAllBranches={context.canViewAllBranches}
      planName={context.plan?.name ?? "Trial"}
      subscriptionStatus={context.subscription?.status ?? "trial"}
      unreadCount={unread}
      smsCredits={wallet}
      maintenance={platform.maintenanceEnabled
        ? { message: platform.maintenanceMessage }
        : null}
    >
      {children}
    </AppShell>
  );
}
