import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptionPlans, subscriptions, tenantMemberships, tenants } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreateOrganisationForm } from "@/components/admin/create-organisation-form";
import { Building2 } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function AdminOrganisationsPage() {
  await requireSuperAdmin();

  const [orgRows, memberRows, plans] = await Promise.all([
    db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        businessType: tenants.businessType,
        location: tenants.location,
        status: tenants.status,
        createdAt: tenants.createdAt,
        onboardingCompletedAt: tenants.onboardingCompletedAt,
        planName: subscriptionPlans.name,
        subscriptionStatus: subscriptions.status,
      })
      .from(tenants)
      .leftJoin(subscriptions, eq(subscriptions.tenantId, tenants.id))
      .leftJoin(subscriptionPlans, eq(subscriptionPlans.key, subscriptions.planKey))
      .orderBy(asc(tenants.name)),
    db
      .select({ tenantId: tenantMemberships.tenantId })
      .from(tenantMemberships)
      .where(eq(tenantMemberships.status, "active")),
    db
      .select({
        key: subscriptionPlans.key,
        name: subscriptionPlans.name,
        smsCredits: subscriptionPlans.smsCredits,
      })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(asc(subscriptionPlans.sortOrder)),
  ]);

  const membersByOrg = new Map<string, number>();
  for (const row of memberRows) {
    membersByOrg.set(row.tenantId, (membersByOrg.get(row.tenantId) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeader
        eyebrow="SamTech Labs"
        title="Organisations"
        description="Every workspace on Madetom, with its plan, members and setup state."
      />

      {orgRows.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <EmptyState
            icon={Building2}
            title="No organisations yet"
            description="Create the first workspace and invite its owner."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Organisation</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Plan</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Members</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {orgRows.map((org) => (
                  <tr key={org.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/organisations/${org.id}`} className="font-medium text-foreground hover:underline">
                        {org.name}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {org.businessType}
                        {org.location ? ` · ${org.location}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                      {org.planName ?? "—"}
                      {org.subscriptionStatus ? (
                        <span className="mt-0.5 block text-[11px] capitalize">{org.subscriptionStatus}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                      {membersByOrg.get(org.id) ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={org.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-[11.5px] text-muted-foreground">
                      {formatDate(org.createdAt, "short")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6">
        <CreateOrganisationForm
          plans={plans.map((plan) => ({
            key: plan.key,
            name: plan.name,
            smsCredits: plan.smsCredits,
          }))}
        />
      </div>
    </div>
  );
}
