import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChartNoAxesCombined,
  MessageSquare,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { SignupForm } from "@/components/auth/signup-form";
import { getAllPlans } from "@/lib/subscription/plans";

export const metadata: Metadata = {
  title: "Create your workspace",
  description:
    "Set up your Madetom workspace, choose a plan and pay securely with Paystack. Built for Ghanaian shops and distributors.",
  robots: { index: true, follow: true },
};

const valuePoints = [
  {
    icon: Store,
    title: "Sell from day one",
    description: "A fast till with barcode search, receipts and Mobile Money built in.",
  },
  {
    icon: Building2,
    title: "One source of stock truth",
    description: "Sales, purchases and adjustments keep every branch in step.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Numbers you can act on",
    description: "See sales, profit and stock without stitching together notebooks.",
  },
  {
    icon: MessageSquare,
    title: "SMS that reaches your team",
    description: "Invitations, resets and stock alerts arrive on the phone they carry.",
  },
];

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedPlan = typeof params.plan === "string" ? params.plan : "starter";
  const plans = getAllPlans();

  return (
    <div className="min-h-svh bg-[#f6f7f3]">
      <header className="border-b border-border/70 bg-[#f6f7f3]/90 backdrop-blur-md">
        <div className="page-container flex h-[68px] items-center justify-between gap-4">
          <Link href="/" aria-label="Madetom home" className="rounded-md">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Back to home
            </Link>
            <Link
              href="/login"
              className="text-[12.5px] font-semibold text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="page-container py-8 sm:py-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-12">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Badge variant="gold" className="px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em]">
              Self-serve sign-up
            </Badge>
            <h1 className="display-title mt-4 text-[clamp(2rem,4.6vw,3.15rem)] text-ink text-balance">
              Set up your shop in one sitting.
            </h1>
            <p className="mt-4 max-w-md text-[14px] leading-[1.75] text-muted-foreground">
              Create your workspace, choose a plan and pay with Paystack. You will land in a ready
              till with your first branch, owner account and SMS wallet already set up.
            </p>

            <div className="mt-8 space-y-4 border-t border-border pt-7">
              {valuePoints.map((point) => (
                <div key={point.title} className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
                    <point.icon className="size-4" strokeWidth={1.9} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{point.title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                      {point.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-[12px] font-semibold text-ink">Payment stays with Paystack</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                    Madetom never sees or stores your card details. The workspace activates only
                    after the payment is verified on our server.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 flex items-start gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
              <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
              Prices are in Ghana cedis and billed monthly. Change or cancel any time from your
              subscription page.
            </p>
          </aside>

          <div>
            <SignupForm plans={plans} defaultPlan={requestedPlan} />
          </div>
        </div>
      </main>
    </div>
  );
}
