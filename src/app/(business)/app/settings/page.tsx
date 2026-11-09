import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { BusinessSettingsForm } from "@/components/settings/business-settings-form";
import { StatusBadge } from "@/components/ui/status-badge";

/** This screen reads request-time data, so it is a blocking route. */

export default async function SettingsPage() {
  const context = await requireBusiness("settings.view");
  const canManage = context.permissions.has("settings.manage");

  const branchRows = await db
    .select()
    .from(branches)
    .where(eq(branches.tenantId, context.tenant.id))
    .orderBy(asc(branches.createdAt));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={context.tenant.name}
        title="Settings"
        description="Business profile, trading rules and branches for this workspace."
      />

      {canManage ? (
        <BusinessSettingsForm
          values={{
            name: context.tenant.name,
            businessType: context.tenant.businessType,
            region: context.tenant.region,
            location: context.tenant.location,
            phone: context.tenant.phone,
            email: context.tenant.email,
            taxRate: String(context.tenant.taxRate),
            pricesIncludeTax: context.tenant.pricesIncludeTax,
            allowPartialPayments: context.tenant.allowPartialPayments,
          }}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <SectionHeading title="Business details" description="Only the owner can change these." />
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Business name", value: context.tenant.name },
              { label: "Business type", value: context.tenant.businessType },
              { label: "Region", value: context.tenant.region ?? "—" },
              { label: "Location", value: context.tenant.location ?? "—" },
              { label: "Phone", value: context.tenant.phone ?? "—" },
              { label: "Email", value: context.tenant.email ?? "—" },
              { label: "Tax rate", value: `${context.tenant.taxRate}%` },
              { label: "Prices include tax", value: context.tenant.pricesIncludeTax ? "Yes" : "No" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-background px-3.5 py-3">
                <dt className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{item.label}</dt>
                <dd className="mt-1 text-[13px] font-medium text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border/80 px-4 py-3.5">
          <SectionHeading title="Branches" description="Where this workspace trades." />
        </div>
        <ul className="divide-y divide-border/80">
          {branchRows.map((branch) => (
            <li key={branch.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-foreground">{branch.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {branch.code}
                  {branch.address ? ` · ${branch.address}` : ""}
                </p>
              </div>
              <StatusBadge status={branch.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
