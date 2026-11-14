import { cookies } from "next/headers";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, tenants } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";

/** The platform console reads the session and platform data at request time. */

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  const cookieStore = await cookies();
  // Remembered from the last visit so the sidebar paints at the right width.
  const sidebarCollapsed =
    cookieStore.get("madetom_admin_sidebar")?.value === "collapsed";

  const [pendingInvitations, suspendedOrgs] = await Promise.all([
    db
      .select({ value: count() })
      .from(invitations)
      .where(eq(invitations.status, "pending"))
      .then((rows) => Number(rows[0]?.value ?? 0)),
    db
      .select({ value: count() })
      .from(tenants)
      .where(eq(tenants.status, "suspended"))
      .then((rows) => Number(rows[0]?.value ?? 0)),
  ]);

  return (
    <AdminShell
      user={{ name: user.name, email: user.email }}
      pendingInvitations={pendingInvitations}
      suspendedOrgs={suspendedOrgs}
      defaultSidebarCollapsed={sidebarCollapsed}
    >
      {children}
    </AdminShell>
  );
}
