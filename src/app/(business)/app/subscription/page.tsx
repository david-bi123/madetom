import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smsWallets, subscriptionPayments } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { PageHeader, StatCard, SectionHeading } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { InlineHint } from "@/components/ui/page-header";
import { CreditCard, Check, Lock, ArrowRight, CalendarClock, MessageSquare } from "lucide-react";
import { getOrganisationUsage } from "@/lib/subscription/entitlements";
import {
  cheapestPlanForFeature,
  formatLimit,
  formatPlanPrice,
  getPlanConfig,
  PLAN_CONFIGS,
  SUBSCRIPTION_STATUS_RULES,
  type PlanEntitlement,
} from "@/lib/subscription/plans";
import { paystackConfigured } from "@/lib/payments/paystack";
import { PlanPaymentForm } from "@/components/subscription/plan-payment-form";

/** This screen reads request-time data, so it is a blocking route. */

const PAYMENT_MESSAGES: Record<string, { tone: "success" | "danger"; text: string }> = {
  success: {
    tone: "success",
    text: "Payment received and verified. Your subscription has been updated.",
  },
  failed: {
    tone: "danger",
    text: "The payment was not completed. No subscription changes were made.",
  },
  missing: { tone: "danger", text: "No payment reference was supplied." },
  unconfigured: { tone: "danger", text: "Card payments are not configured on this deployment." },
};

function UsageBar({
  label,
  used,
  limit,
  hint,
}: {
  label: string;
  used: number;
  limit: number | null;
  hint?: string;
}) {
  const percentage = limit === null ? 0 : limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  const atLimit = limit !== null && used >= limit;
  const nearLimit = limit !== null && !atLimit && used / limit >= 0.8;
  const tone = atLimit ? "bg-[#c25a4a]" : nearLimit ? "bg-[#c8962d]" : "bg-primary";

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-3 text-[12.5px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono text-[11.5px] text-muted-foreground tabular">
          {used.toLocaleString()} / {limit === null ? "Unlimited" : limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${tone}`}
          style={{ width: limit === null ? "100%" : `${percentage}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit ?? undefined}
          aria-label={label}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">{hint ?? (limit === null ? "No limit on this plan." : `${formatLimit(limit)} included.`)}</p>
        {atLimit ? <p className="text-[11px] font-medium text-destructive">Limit reached</p> : null}
        {nearLimit ? <p className="text-[11px] font-medium text-[#8a641a]">Approaching limit</p> : null}
      </div>
    </div>
  );
}

function FeatureGroup({ features }: { features: PlanEntitlement[] }) {
  const groups = new Map<string, PlanEntitlement[]>();
  for (const feature of features) {
    groups.set(feature.group, [...(groups.get(feature.group) ?? []), feature]);
  }
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2">
      {[...groups.entries()].map(([group, items]) => (
        <div key={group}>
          <p className="mb-2 text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {group}
          </p>
          <ul className="space-y-1.5">
            {items.map((feature) => (
              <li key={feature.key} className="flex items-start gap-2 text-[12.5px] text-foreground">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[#1a4634]" aria-hidden />
                <span>
                  {feature.label}
                  <span className="block text-[11px] leading-relaxed text-muted-foreground">
                    {feature.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const context = await requireBusiness("subscription.view");
  const tenantId = context.tenant.id;
  const { payment } = await searchParams;

  const [usage, walletRow, paymentRows] = await Promise.all([
    getOrganisationUsage(tenantId),
    db
      .select({ credits: smsWallets.credits })
      .from(smsWallets)
      .where(eq(smsWallets.tenantId, tenantId))
      .limit(1),
    db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.tenantId, tenantId))
      .orderBy(desc(subscriptionPayments.createdAt))
      .limit(6),
  ]);

  const wallet = Number(walletRow[0]?.credits ?? 0);
  const status = usage.subscriptionStatus;
  const statusRules = status ? SUBSCRIPTION_STATUS_RULES[status] : null;
  const currentPlan = usage.plan;
  const allFeatures = PLAN_CONFIGS.business.features;
  const currentKeys = new Set(currentPlan?.features.map((feature) => feature.key) ?? []);
  const includedFeatures = allFeatures.filter((feature) => currentKeys.has(feature.key));
  const restrictedFeatures = allFeatures
    .filter((feature) => !currentKeys.has(feature.key))
    .map((feature) => ({ feature, requiredPlan: cheapestPlanForFeature(feature.key) }))
    .filter((entry): entry is { feature: PlanEntitlement; requiredPlan: NonNullable<ReturnType<typeof cheapestPlanForFeature>> } =>
      entry.requiredPlan !== null,
    );

  const upgradePlans = Object.values(PLAN_CONFIGS)
    .filter((plan) => plan.sortOrder > (currentPlan?.sortOrder ?? 0))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const paymentExempt = context.tenant.paymentExempt;
  const canPay = paystackConfigured() && context.roleKey === "owner" && !paymentExempt;
  const paymentMessage = payment ? PAYMENT_MESSAGES[payment] : null;
  const daysRemaining = usage.renewalDate
    ? Math.max(0, Math.ceil((usage.renewalDate.getTime() - new Date().getTime()) / 86400000))
    : null;

  return (
    <div>
      <PageHeader
        eyebrow={context.tenant.name}
        title="Plan & usage"
        description="Your subscription, what you have used, and the features available on each plan."
        actions={<StatusBadge status={status ?? "none"} />}
      />

      {paymentMessage ? (
        <div className="mb-4">
          <InlineHint tone={paymentMessage.tone === "success" ? "success" : "danger"}>
            {paymentMessage.text}
          </InlineHint>
        </div>
      ) : null}

      {paymentExempt ? (
        <div className="mb-4">
          <InlineHint tone="success">
            This workspace is billed manually by the Madetom team, so online payment is disabled
            here. Your plan and limits are unaffected.
          </InlineHint>
        </div>
      ) : null}

      {statusRules && !statusRules.writable ? (
        <div className="mb-4">
          <InlineHint tone="danger">{statusRules.message}</InlineHint>
        </div>
      ) : status === "past_due" ? (
        <div className="mb-4">
          <InlineHint tone="warning">{SUBSCRIPTION_STATUS_RULES.past_due.message}</InlineHint>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Current plan" value={currentPlan?.name ?? "No plan"} icon={CreditCard} tone="gold" />
        <StatCard
          label="Monthly price"
          value={currentPlan ? formatPlanPrice(currentPlan.priceMonthly) : "—"}
          hint={currentPlan ? (paymentExempt ? "Billed manually" : "Billed monthly") : undefined}
        />
        <StatCard
          label="Renews"
          value={usage.renewalDate ? formatDate(usage.renewalDate, "short") : "—"}
          icon={CalendarClock}
          hint={daysRemaining === null ? undefined : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
        />
        <StatCard label="SMS credits" value={wallet.toLocaleString()} icon={MessageSquare} hint="Separate wallet" />
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border/80 px-4 py-3.5">
          <SectionHeading
            title="Usage against your plan"
            description={currentPlan?.description ?? "Your workspace plan limits what you can add."}
          />
        </div>
        <div className="divide-y divide-border/80">
          <UsageBar
            label="Products"
            used={usage.products.used}
            limit={usage.products.limit}
            hint={
              usage.products.limit === null
                ? "Unlimited products on the Business plan."
                : `${Math.max(0, usage.products.limit - usage.products.used).toLocaleString()} slot(s) remaining.`
            }
          />
          <UsageBar
            label="Team members"
            used={usage.staff.used}
            limit={usage.staff.limit}
            hint={`${usage.staff.active} active · ${usage.staff.pendingInvitations} pending invitation(s).`}
          />
          <UsageBar
            label="Branches"
            used={usage.branches.used}
            limit={usage.branches.limit}
            hint={
              usage.branches.limit === null
                ? "Unlimited branches."
                : `${Math.max(0, usage.branches.limit - usage.branches.used)} branch slot(s) remaining.`
            }
          />
        </div>
        {usage.overLimit ? (
          <div className="border-t border-border/80 p-4">
            <InlineHint tone="warning">
              Your usage is above the current plan limits. Existing records are preserved and can still
              be viewed or exported, but new records that exceed a limit are blocked until you upgrade or
              archive some records.
            </InlineHint>
          </div>
        ) : null}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border/80 px-4 py-3.5">
          <SectionHeading
            title="Included in your plan"
            description={`${includedFeatures.length} feature${includedFeatures.length === 1 ? "" : "s"} available now.`}
          />
        </div>
        <FeatureGroup features={includedFeatures} />
      </section>

      {restrictedFeatures.length > 0 ? (
        <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border/80 px-4 py-3.5">
            <SectionHeading
              title="Available on higher plans"
              description="Upgrade to unlock these capabilities."
            />
          </div>
          <ul className="divide-y divide-border/80">
            {restrictedFeatures.map(({ feature, requiredPlan }) => (
              <li key={feature.key} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <div>
                    <p className="text-[12.5px] font-medium text-foreground">{feature.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                  {getPlanConfig(requiredPlan).name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {upgradePlans.length > 0 || currentPlan ? (
        <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border/80 px-4 py-3.5">
            <SectionHeading
              title={upgradePlans.length > 0 ? "Upgrade your plan" : "Renew your plan"}
              description={
                paymentExempt
                  ? "This workspace is billed manually, so online payment is disabled."
                  : canPay
                    ? "Pay securely with Paystack. Your plan activates as soon as the payment is verified."
                    : "Only the business owner can start a payment."
              }
            />
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {currentPlan ? (
              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12.5px] font-semibold text-foreground">
                      Renew {currentPlan.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Extend the current plan by another 30 days.
                    </p>
                  </div>
                  <span className="font-mono text-[15px] font-bold text-primary">
                    {formatPlanPrice(currentPlan.priceMonthly)}
                  </span>
                </div>
                {canPay ? (
                  <PlanPaymentForm
                    planKey={currentPlan.key}
                    label={`Pay ${formatPlanPrice(currentPlan.priceMonthly)}`}
                    variant="outline"
                  />
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {paymentExempt
                      ? "Renewals are handled by the Madetom team."
                      : "Ask the business owner to renew this plan."}
                  </p>
                )}
              </div>
            ) : null}

            {upgradePlans.map((plan) => (
              <div
                key={plan.key}
                className={`rounded-xl border p-4 ${plan.key === "business" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12.5px] font-semibold text-foreground">{plan.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{plan.description}</p>
                  </div>
                  <span className="font-mono text-[15px] font-bold text-primary">
                    {formatPlanPrice(plan.priceMonthly)}
                  </span>
                </div>
                <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                  {formatLimit(plan.maxProducts)} products · {plan.maxStaff} staff · {plan.maxBranches}{" "}
                  branches
                </p>
                {canPay ? (
                  <PlanPaymentForm
                    planKey={plan.key}
                    label={
                      <span className="flex items-center gap-2">
                        Upgrade to {plan.name} <ArrowRight className="size-4" />
                      </span>
                    }
                    variant={plan.key === "business" ? "default" : "outline"}
                  />
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {paymentExempt
                      ? "Plan changes are handled by the Madetom team."
                      : "Ask the business owner to upgrade to this plan."}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border/80 px-4 py-3.5">
          <SectionHeading title="Payment history" description="Recent Paystack transactions for this workspace." />
        </div>
        {paymentRows.length === 0 ? (
          <p className="px-4 py-5 text-[12px] text-muted-foreground">
            No card payments yet. Payments you make will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Reference</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Plan</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Amount</th>
                  <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {paymentRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{row.reference}</td>
                    <td className="px-4 py-3 text-[12px] capitalize text-foreground">{row.planKey}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-foreground">
                      {formatMoney(row.amount, row.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-[11.5px] text-muted-foreground">
                      {formatDate(row.paidAt ?? row.createdAt, "short")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
