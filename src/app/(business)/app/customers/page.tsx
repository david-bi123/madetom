import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, sales } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatMinor, toMinor } from "@/lib/format";
import { PageHeader, EmptyState, StatCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SuccessBanner } from "@/components/ui/success-banner";
import { Button } from "@/components/ui/button";
import { ArchiveCustomerButton } from "@/components/customers/archive-customer-button";
import { Plus, Users } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const context = await requireBusiness("customers.view");
  const tenantId = context.tenant.id;
  const branchId = context.activeBranch.id;
  const canManage = context.permissions.has("customers.manage");
  const { created } = await searchParams;

  const customerRows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      status: customers.status,
    })
    .from(customers)
    .where(eq(customers.tenantId, tenantId))
    .orderBy(desc(customers.createdAt))
    .limit(200);

  const spendingRows = await db
    .select({
      customerId: sales.customerId,
      total: sales.total,
    })
    .from(sales)
    .where(
      and(
        eq(sales.tenantId, tenantId),
        eq(sales.branchId, branchId),
        eq(sales.status, "completed"),
      ),
    );

  const spentByCustomer = new Map<string, number>();
  for (const row of spendingRows) {
    if (!row.customerId) continue;
    spentByCustomer.set(
      row.customerId,
      (spentByCustomer.get(row.customerId) ?? 0) + toMinor(row.total),
    );
  }

  const active = customerRows.filter((customer) => customer.status === "active");
  const totalValue = [...spentByCustomer.values()].reduce((sum, value) => sum + value, 0);
  const repeatBuyers = [...spentByCustomer.entries()].filter(([, value]) => value > 0).length;

  return (
    <div>
      <PageHeader
        eyebrow={context.activeBranch.name}
        title="Customers"
        description="People who bought at this branch, with the lifetime value of their orders."
        actions={
          canManage ? (
            <Button render={<Link href="/app/customers/new" />} nativeButton={false}>
              <Plus className="size-4" aria-hidden />
              Add customer
            </Button>
          ) : undefined
        }
      />

      {created ? <SuccessBanner message="Customer added to this workspace." /> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active customers" value={String(active.length)} icon={Users} />
        <StatCard label="Buying customers" value={String(repeatBuyers)} tone="gold" />
        <StatCard label="Lifetime value" value={formatMinor(totalValue)} />
        <StatCard label="Archived" value={String(customerRows.length - active.length)} />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {customerRows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Walk-in sales and credit accounts will be linked here as they appear."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Customer</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Contact</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Lifetime value</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Status</th>
                  {canManage ? (
                    <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      Action
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {customerRows.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{customer.name}</td>
                    <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                      <div>{customer.phone ?? "—"}</div>
                      <div className="mt-0.5 text-[11px]">{customer.email ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                      {formatMinor(spentByCustomer.get(customer.id) ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={customer.status} />
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3 text-right">
                        <ArchiveCustomerButton customerId={customer.id} name={customer.name} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
