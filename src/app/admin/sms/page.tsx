import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smsLogs, smsTransactions, smsWallets, tenants } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { PageHeader, StatCard, SectionHeading, EmptyState } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SmsCreditForm } from "@/components/admin/sms-credit-form";
import { MessageSquare, Wallet } from "lucide-react";

/** This screen reads request-time data, so it is a blocking route. */

export default async function AdminSmsPage() {
  await requireSuperAdmin();

  const [walletRows, logRows, transactionRows] = await Promise.all([
    db
      .select({
        tenantId: smsWallets.tenantId,
        tenantName: tenants.name,
        credits: smsWallets.credits,
      })
      .from(smsWallets)
      .innerJoin(tenants, eq(tenants.id, smsWallets.tenantId))
      .orderBy(desc(smsWallets.credits)),
    db
      .select({
        id: smsLogs.id,
        phone: smsLogs.phone,
        message: smsLogs.message,
        purpose: smsLogs.purpose,
        provider: smsLogs.provider,
        status: smsLogs.status,
        error: smsLogs.error,
        creditsUsed: smsLogs.creditsUsed,
        createdAt: smsLogs.createdAt,
        tenantName: tenants.name,
      })
      .from(smsLogs)
      .leftJoin(tenants, eq(tenants.id, smsLogs.tenantId))
      .orderBy(desc(smsLogs.createdAt))
      .limit(80),
    db
      .select({
        id: smsTransactions.id,
        type: smsTransactions.type,
        credits: smsTransactions.credits,
        balanceAfter: smsTransactions.balanceAfter,
        description: smsTransactions.description,
        createdAt: smsTransactions.createdAt,
        tenantName: tenants.name,
      })
      .from(smsTransactions)
      .innerJoin(tenants, eq(tenants.id, smsTransactions.tenantId))
      .orderBy(desc(smsTransactions.createdAt))
      .limit(40),
  ]);

  const totalCredits = walletRows.reduce((sum, row) => sum + row.credits, 0);
  const sentCount = logRows.filter((row) => row.status === "sent").length;
  const failedCount = logRows.filter((row) => row.status === "failed").length;

  return (
    <div>
      <PageHeader
        eyebrow="SamTech Labs"
        title="SMS"
        description="Message delivery across every workspace, with wallet balances and credits issued."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Credits in circulation" value={String(totalCredits)} icon={Wallet} tone="gold" />
        <StatCard label="Wallets" value={String(walletRows.length)} />
        <StatCard label="Sent (recent)" value={String(sentCount)} icon={MessageSquare} />
        <StatCard label="Failed (recent)" value={String(failedCount)} tone={failedCount > 0 ? "critical" : "default"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/80 px-4 py-3.5">
              <SectionHeading
                title="Recent messages"
                description="The 80 most recent SMS attempts, with content and delivery result."
              />
            </div>
            {logRows.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No messages sent yet"
                description="Invitations and notifications will show up here."
              />
            ) : (
              <ul className="divide-y divide-border/80">
                {logRows.map((log) => (
                  <li key={log.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-mono text-[11.5px] text-foreground">{log.phone}</span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                          {log.purpose}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {log.tenantName ?? "Platform"}
                        </span>
                        <StatusBadge status={log.status} />
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                      {log.message}
                    </p>
                    <p className="mt-1 text-[10.5px] text-muted-foreground">
                      {log.provider} · {formatDate(log.createdAt, "datetime")}
                      {log.error ? ` · ${log.error}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/80 px-4 py-3.5">
              <SectionHeading
                title="Wallet ledger"
                description="Credits issued, spent and refunded across workspaces."
              />
            </div>
            {transactionRows.length === 0 ? (
              <p className="px-4 py-5 text-[12px] text-muted-foreground">No wallet activity yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/45">
                      <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Organisation</th>
                      <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Type</th>
                      <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Description</th>
                      <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Credits</th>
                      <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    {transactionRows.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 text-[12.5px]">{row.tenantName}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.type === "credit" ? "active" : "cancelled"} label={row.type} />
                        </td>
                        <td className="px-4 py-3 text-[12px] text-muted-foreground">{row.description}</td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] font-medium tabular">
                          {row.type === "credit" ? "+" : "−"}
                          {row.credits}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] tabular text-muted-foreground">
                          {row.balanceAfter}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/80 px-4 py-3.5">
              <SectionHeading title="Wallet balances" description="Credits available per workspace." />
            </div>
            <ul className="divide-y divide-border/80">
              {walletRows.length === 0 ? (
                <p className="px-4 py-5 text-[12px] text-muted-foreground">No wallets yet.</p>
              ) : (
                walletRows.map((wallet) => (
                  <li key={wallet.tenantId} className="flex items-center justify-between gap-3 px-4 py-3">
                    <p className="truncate text-[12.5px] font-medium text-foreground">{wallet.tenantName}</p>
                    <span className="font-mono text-[12px] font-medium tabular text-foreground">
                      {wallet.credits}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <SmsCreditForm
            wallets={walletRows.map((wallet) => ({
              tenantId: wallet.tenantId,
              tenantName: wallet.tenantName,
              credits: wallet.credits,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
