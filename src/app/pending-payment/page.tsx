import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { subscriptionPlans, subscriptions, tenantMemberships, tenants } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineHint } from "@/components/ui/page-header";
import { PendingPaymentForm } from "@/components/subscription/pending-payment-form";
import { formatLimit, formatPlanPrice } from "@/lib/subscription/plans";

export const metadata: Metadata = {
  title: "Complete your payment",
  description: "Finish activating your Madetom workspace.",
  robots: { index: false, follow: false },
};

export default async function PendingPaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [row] = await db
    .select({ membership: tenantMemberships, tenant: tenants })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(
      and(
        eq(tenantMemberships.userId, session.user.id),
        eq(tenantMemberships.status, "active"),
      ),
    )
    .orderBy(asc(tenantMemberships.joinedAt))
    .limit(1);

  if (!row) redirect("/login?error=no-workspace");
  if (row.tenant.status === "suspended") redirect("/suspended");
  // Nothing to pay for on an organisation that is billed manually.
  if (row.tenant.paymentExempt) redirect("/app");
  if (row.tenant.status !== "pending") redirect("/app");

  const [subscriptionRow] = await db
    .select({ subscription: subscriptions, plan: subscriptionPlans })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.key, subscriptions.planKey))
    .where(eq(subscriptions.tenantId, row.tenant.id))
    .limit(1);

  const params = await searchParams;
  const payment = typeof params.payment === "string" ? params.payment : undefined;
  const checkout = typeof params.checkout === "string" ? params.checkout : undefined;

  const plan = subscriptionRow?.plan ?? null;
  const planKey = subscriptionRow?.subscription.planKey ?? "starter";
  const planName = plan?.name ?? "Starter";
  const price = plan ? Math.round(Number(plan.priceMonthly) * 100) : 0;

  const notice =
    payment === "failed"
      ? "The payment was not completed, so your workspace is still inactive. No money was taken. You can try again below."
      : checkout === "failed"
        ? "We could not open the secure checkout. Your workspace is saved — try again below."
        : null;

  return (
    <div className="min-h-svh bg-[#f6f7f3]">
      <header className="border-b border-border/70 bg-[#f6f7f3]/90 backdrop-blur-md">
        <div className="page-container flex h-[68px] items-center justify-between gap-4">
          <Link href="/" aria-label="Madetom home" className="rounded-md">
            <Logo />
          </Link>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="page-container flex items-start justify-center py-10 sm:py-16">
        <div className="w-full max-w-xl">
          <div className="text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gold-soft text-[#8a641a]">
              <Clock3 className="size-6" aria-hidden />
            </span>
            <Badge variant="warning" className="mt-5">
              Awaiting payment
            </Badge>
            <h1 className="display-title mt-4 text-[clamp(1.9rem,4.4vw,2.7rem)] text-ink text-balance">
              One payment away from your workspace.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-[1.75] text-muted-foreground">
              {row.tenant.name} is created and your owner account is ready. Complete the payment
              below and the till, inventory and reports unlock immediately.
            </p>
          </div>

          {notice ? (
            <div className="mt-6">
              <InlineHint tone="warning">{notice}</InlineHint>
            </div>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-4 border-b border-border/80 p-5">
              <div>
                <p className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  Selected plan
                </p>
                <p className="mt-1 font-heading text-[20px] font-semibold tracking-[-0.02em] text-ink">
                  {planName}
                </p>
                {plan ? (
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {formatLimit(plan.maxProducts)} products · {plan.maxEmployees} staff ·{" "}
                    {plan.maxBranches} branch{plan.maxBranches === 1 ? "" : "es"} ·{" "}
                    {plan.smsCredits} SMS credits
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-mono text-[20px] font-semibold text-primary tabular">
                  {formatPlanPrice(price)}
                </p>
                <p className="text-[11px] text-muted-foreground">per month</p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <PendingPaymentForm planKey={planKey} />

              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                  Pay with card, Mobile Money or bank through Paystack. Your workspace activates
                  only after Paystack confirms the payment on our server.
                </p>
              </div>

              <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                Already paid? Refresh this page in a few seconds. Your business details are saved
                either way.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-[12px] text-muted-foreground">
            Need a different plan or help?{" "}
            <a
              href="mailto:hello@samtechlabs.com?subject=Madetom sign-up help"
              className="font-semibold text-primary hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
