import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { startOfMonth } from "date-fns";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatMinor, formatMoney, toMinor } from "@/lib/format";
import { PageHeader, EmptyState, StatCard } from "@/components/ui/page-header";
import { SuccessBanner } from "@/components/ui/success-banner";
import { Button } from "@/components/ui/button";
import { Plus, Wallet } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const context = await requireBusiness("expenses.view");
  const tenantId = context.tenant.id;
  const canManage = context.permissions.has("expenses.manage");
  const { created } = await searchParams;

  const rows = await db
    .select({
      id: expenses.id,
      category: expenses.category,
      description: expenses.description,
      amount: expenses.amount,
      expenseDate: expenses.expenseDate,
      paymentMethod: expenses.paymentMethod,
      reference: expenses.reference,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .where(eq(expenses.tenantId, tenantId))
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));

  const total = rows.reduce((sum, row) => sum + toMinor(row.amount), 0);

  const monthStart = startOfMonth(new Date());
  const thisMonth = rows
    .filter((row) => new Date(`${row.expenseDate}T00:00:00`) >= monthStart)
    .reduce((sum, row) => sum + toMinor(row.amount), 0);

  const byCategory = new Map<string, number>();
  for (const row of rows) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + toMinor(row.amount));
  }
  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div>
      <PageHeader
        eyebrow={context.activeBranch.name}
        title="Expenses"
        description="Operating costs recorded against the workspace."
        actions={
          canManage ? (
            <Button render={<Link href="/app/expenses/new" />} nativeButton={false}>
              <Plus className="size-4" aria-hidden />
              Record expense
            </Button>
          ) : undefined
        }
      />

      {created ? <SuccessBanner message="Expense recorded and added to your reports." /> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="All expenses" value={formatMinor(total)} icon={Wallet} />
        <StatCard label="This month" value={formatMinor(thisMonth)} tone="gold" />
        <StatCard label="Entries" value={String(rows.length)} />
        <StatCard
          label="Largest category"
          value={topCategory ? topCategory[0] : "—"}
          hint={topCategory ? formatMinor(topCategory[1]) : undefined}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No expenses recorded"
            description="Rent, transport, utilities and stock purchases will show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Date</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Category</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Description</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Amount</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{row.expenseDate}</td>
                    <td className="px-4 py-3 text-[12.5px] font-medium">{row.category}</td>
                    <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                      {row.description}
                      {row.reference ? (
                        <span className="mt-0.5 block font-mono text-[10.5px]">{row.reference}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-[12px] capitalize text-muted-foreground">
                      {row.paymentMethod}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/45">
                  <td className="px-4 py-3 text-[12px] font-semibold" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[12px] font-semibold tabular">
                    {formatMinor(total)}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
