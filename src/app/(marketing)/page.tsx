import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Boxes,
  Check,
  CircleDollarSign,
  ClipboardList,
  FileSpreadsheet,
  Landmark,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Receipt,
  ScanBarcode,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { db } from "@/lib/db";
import { subscriptionPlans } from "@/lib/db/schema";
import { getPlatformSettings } from "@/lib/platform-settings";
import { formatMoney } from "@/lib/format";
import { getCopyrightYear } from "@/lib/copyright";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import {
  InventoryPreview,
  PaymentsRow,
  PosPreview,
  ProductPreview,
  RolePreview,
} from "@/components/marketing/product-preview";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@samtechlabs.com";
const ACCESS_MAILTO = `mailto:${CONTACT_EMAIL}?subject=Madetom access request&body=Hello SamTech Labs,%0A%0AI would like to set up Madetom for my business.%0A%0ABusiness name:%0ALocation:%0AWhat we sell:%0A%0AThank you.`;

/** The landing page reads live plans and platform status from the database. */
export const dynamic = "force-dynamic";
export const instant = false;

const capabilities = [
  {
    icon: ScanBarcode,
    title: "Search, scan, sell",
    description: "Find a product in seconds, scan a barcode, adjust quantities and take payment.",
  },
  {
    icon: PackageCheck,
    title: "Stock that adds up",
    description: "Every sale, refund, purchase and transfer writes to a traceable stock ledger.",
  },
  {
    icon: WalletCards,
    title: "Payments recorded properly",
    description: "Cash, Mobile Money, bank transfer and card — recorded against the sale, not guessed.",
  },
  {
    icon: BarChart3,
    title: "Profit, not just revenue",
    description: "Cost prices and expenses feed real gross-profit reporting, with CSV and PDF exports.",
  },
  {
    icon: Users,
    title: "Roles with boundaries",
    description: "Owners, managers, cashiers and inventory managers see only what their role allows.",
  },
  {
    icon: FileSpreadsheet,
    title: "Ready for your paperwork",
    description: "Export sales, stock, purchases and expenses when your accountant asks.",
  },
];

const operationalDetails = [
  "Per-branch stock with transfers between locations",
  "Reorder levels and unresolved low-stock alerts",
  "Purchase drafts, receiving, and supplier records",
  "Refunds that restore inventory and preserve the audit trail",
  "Customer records and receipt history",
  "Plan limits for staff, products, branches and SMS",
];

function ProfitPreview({ currency }: { currency: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-raised)] sm:p-5" aria-hidden="true">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Gross profit · 30 days</p>
          <p className="mt-1 font-heading text-[26px] leading-none font-semibold tracking-[-0.04em] tabular">
            {formatMoney(2648.4, currency)}
          </p>
        </div>
        <span className="rounded-md bg-success-soft px-2 py-1 text-[9px] font-semibold text-success">+8.6%</span>
      </div>
      <svg viewBox="0 0 340 120" className="mt-4 w-full" role="presentation">
        {[20, 50, 80, 110].map((y) => (
          <line key={y} x1="0" x2="340" y1={y} y2={y} stroke="#edf0ea" strokeWidth="1" />
        ))}
        <defs>
          <linearGradient id="profit-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#146b50" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#146b50" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 94 L34 82 L68 88 L102 64 L136 70 L170 48 L204 55 L238 32 L272 40 L306 22 L340 27 L340 120 L0 120 Z"
          fill="url(#profit-fill)"
        />
        <path
          d="M0 94 L34 82 L68 88 L102 64 L136 70 L170 48 L204 55 L238 32 L272 40 L306 22 L340 27"
          fill="none"
          stroke="#146b50"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="306" cy="22" r="3.5" fill="#146b50" stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="mt-1 flex justify-between text-[8px] text-muted-foreground">
        <span>Week 1</span>
        <span>Week 2</span>
        <span>Week 3</span>
        <span>Week 4</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
        {[
          { label: "Net sales", value: formatMoney(8490, currency) },
          { label: "Cost of goods", value: formatMoney(5841.6, currency) },
          { label: "Expenses", value: formatMoney(1260, currency) },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-[8px] text-muted-foreground">{item.label}</p>
            <p className="mt-0.5 text-[10px] font-semibold tabular">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: typeof ScanBarcode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] ${className ?? ""}`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/7 text-primary">
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <h3 className="mt-4 font-heading text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export default async function LandingPage() {
  let plans: Array<typeof subscriptionPlans.$inferSelect> = [];
  try {
    plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(asc(subscriptionPlans.sortOrder));
  } catch {
    plans = [];
  }

  const platform = await getPlatformSettings();
  const inMaintenance = platform.maintenanceEnabled;
  const copyrightYear = await getCopyrightYear();

  return (
    <div className="min-h-screen bg-[#f6f7f3]">
      <MarketingHeader contactEmail={CONTACT_EMAIL} />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="pointer-events-none absolute inset-0 grid-paper opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
          <div className="pointer-events-none absolute top-0 right-0 h-[560px] w-[560px] translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,rgb(232_196_109/16%),transparent_65%)]" />
          <div className="page-container relative grid items-center gap-14 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:py-24">
            <div className="animate-rise max-w-[650px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/12 bg-white/80 py-1 pr-3 pl-1.5 text-[11px] font-medium text-primary shadow-[0_1px_2px_rgb(16_35_27/4%)]">
                <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold tracking-wide text-white">
                  MADE FOR GHANA
                </span>
                Point of sale · Inventory · Reporting
              </div>

              <h1 className="display-title mt-6 text-[clamp(3.2rem,6.4vw,5.5rem)] text-ink">
                Your trade,
                <br />
                <span className="text-primary">under control.</span>
              </h1>

              <p className="mt-6 max-w-[520px] text-[15px] leading-[1.75] text-muted-foreground sm:text-[16px]">
                Madetom brings your till, your stock and your numbers into one calm system.
                Built for Ghanaian shops, provision stores and distributors that are ready to
                run on facts, not guesswork.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-11 px-5 text-[14px]" render={<Link href="/login" />} nativeButton={false}>
                  Sign in to Madetom
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 bg-white/80 px-5 text-[14px]"
                  render={<a href={ACCESS_MAILTO} />}
                 nativeButton={false}>
                  Request access
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" />
                  Accounts are created by our team
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" />
                  Built in Accra
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LockKeyhole className="size-3.5 text-primary" />
                  No public sign-up
                </span>
              </div>
            </div>

            <div className="animate-rise stagger-2 lg:pl-4">
              <ProductPreview />
              <p className="mt-14 text-center text-[10px] tracking-wide text-muted-foreground/80 uppercase lg:mt-12">
                Illustrative product preview
              </p>
            </div>
          </div>
        </section>

        {/* Promise strip */}
        <section className="border-b border-border/70 bg-white/60">
          <div className="page-container grid divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { icon: ShoppingCart, title: "A faster till", copy: "Keyboard-first checkout, barcode search and printable receipts." },
              { icon: Boxes, title: "A stock ledger you can trust", copy: "Every movement recorded. Every branch accounted for." },
              { icon: BarChart3, title: "Numbers that mean something", copy: "Revenue, cost of goods, expenses and real gross profit." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 py-5 sm:px-6 first:sm:pl-0 last:sm:pr-0">
                <item.icon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.8} />
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sell section */}
        <section id="product" className="scroll-mt-24 py-16 sm:py-24">
          <div className="page-container">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
              <div className="max-w-xl">
                <p className="eyebrow">The till</p>
                <h2 className="display-title mt-3 text-[clamp(2.1rem,4vw,3.4rem)] text-ink">
                  Serve the queue.
                  <br />
                  <span className="text-primary">Not the software.</span>
                </h2>
                <p className="mt-5 text-[14px] leading-[1.8] text-muted-foreground">
                  The POS is built for the rhythm of a busy counter. Search or scan, adjust
                  quantities, choose a payment method, and hand over a proper receipt. A completed
                  sale updates stock in the same transaction — no end-of-day reconciliation.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Barcode search and keyboard-first product search",
                    "Cash, Mobile Money, bank transfer and card recording",
                    "Discounts, receipts, refunds and partial payments",
                    "A branch-aware till with cashier accountability",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink/85">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary">
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 max-w-md text-[11.5px] leading-relaxed text-muted-foreground">
                  Madetom records Mobile Money and card payments. It does not process money
                  through a payment gateway unless one is explicitly connected.
                </p>
                <div className="mt-6">
                  <PaymentsRow />
                </div>
              </div>
              <div className="lg:pl-4">
                <PosPreview />
              </div>
            </div>
          </div>
        </section>

        {/* Stock & operations */}
        <section id="operations" className="scroll-mt-24 border-y border-border/70 bg-[#f0f3ee] py-16 sm:py-24">
          <div className="page-container">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div className="max-w-2xl lg:sticky lg:top-28 lg:self-start">
                <p className="eyebrow">The back room</p>
                <h2 className="display-title mt-3 text-[clamp(2.1rem,4vw,3.4rem)] text-ink">
                  Know what you own.
                  <br />
                  <span className="text-primary">Before it runs out.</span>
                </h2>
                <p className="mt-5 text-[14px] leading-[1.8] text-muted-foreground">
                  Madetom keeps a proper stock ledger for every branch. Products move through
                  purchases, sales, refunds, adjustments and transfers — and every movement is
                  attributable to a person and a document.
                </p>
                <div className="mt-7 grid gap-2 sm:grid-cols-2">
                  {operationalDetails.map((detail) => (
                    <div key={detail} className="flex items-start gap-2 rounded-lg border border-border/70 bg-white/70 p-2.5">
                      <Check className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={2.5} />
                      <span className="text-[11.5px] leading-relaxed text-muted-foreground">{detail}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
                    <Truck className="size-3.5 text-primary" /> Purchases & suppliers
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
                    <ClipboardList className="size-3.5 text-primary" /> Stock counts & adjustments
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
                    <Store className="size-3.5 text-primary" /> Multi-branch transfers
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <InventoryPreview />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Receiving a purchase</span>
                      <span className="rounded bg-success-soft px-1.5 py-0.5 text-[8px] font-semibold text-success">Atomic</span>
                    </div>
                    <div className="mt-3 rounded-lg border border-border bg-[#fbfcfa] p-3">
                      <p className="text-[9px] font-medium">PO-00003 · Nkrumah Wholesale</p>
                      <p className="mt-0.5 text-[8px] text-muted-foreground">8 lines · Received at Adabraka</p>
                      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                        <span className="text-[8px] text-muted-foreground">Inventory value added</span>
                        <span className="text-[10px] font-semibold tabular">GH₵ 2,340.00</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Stock movement</span>
                      <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[8px] font-semibold text-warning">Low</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-muted-foreground">Eggs Crate (30)</span>
                        <span className="font-medium tabular">−2</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-muted-foreground">Balance after</span>
                        <span className="font-semibold tabular">6 left</span>
                      </div>
                      <div className="rounded-md bg-muted/60 px-2 py-1.5 text-[8px] leading-relaxed text-muted-foreground">
                        Alert created once. It stays unresolved until stock is replenished.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reporting + capabilities */}
        <section className="py-16 sm:py-24">
          <div className="page-container">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div className="order-2 lg:order-1">
                <ProfitPreview currency="GHS" />
              </div>
              <div className="order-1 max-w-xl lg:order-2">
                <p className="eyebrow">The numbers</p>
                <h2 className="display-title mt-3 text-[clamp(2.1rem,4vw,3.4rem)] text-ink">
                  Revenue is not profit.
                  <br />
                  <span className="text-primary">Madetom knows the difference.</span>
                </h2>
                <p className="mt-5 text-[14px] leading-[1.8] text-muted-foreground">
                  Cost prices are captured on every sale line. Expenses are recorded against
                  branches. Reports show net sales, cost of goods, gross profit and the effect of
                  expenses — with the date range and level of detail you choose.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: CircleDollarSign, label: "Sales and profit", detail: "Daily, weekly, monthly" },
                    { icon: Receipt, label: "Expenses", detail: "By category and branch" },
                    { icon: Boxes, label: "Inventory valuation", detail: "At cost, by branch" },
                    { icon: FileSpreadsheet, label: "CSV and PDF", detail: "Reports ready to share" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3">
                      <item.icon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.8} />
                      <div>
                        <p className="text-[12px] font-semibold">{item.label}</p>
                        <p className="text-[10.5px] text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-20">
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="eyebrow">One operating system</p>
                  <h2 className="font-heading text-[26px] font-semibold tracking-[-0.035em] text-ink sm:text-[30px]">
                    Everything the shop touches, in one place.
                  </h2>
                </div>
                <p className="max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
                  Not a collection of tools that need reconciling. One source of truth for products,
                  people and money.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {capabilities.map((capability) => (
                  <FeatureCard key={capability.title} {...capability} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-24 border-y border-border/70 bg-white/60 py-16 sm:py-24">
          <div className="page-container grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <p className="eyebrow">The team</p>
              <h2 className="display-title mt-3 text-[clamp(2.1rem,4vw,3.4rem)] text-ink">
                Everyone has a job.
                <br />
                <span className="text-primary">Everyone sees what they need.</span>
              </h2>
              <p className="mt-5 text-[14px] leading-[1.8] text-muted-foreground">
                A cashier should not see the business&apos;s profit. An inventory manager should
                not need access to payroll-level settings. Madetom gives each person a clear role —
                and lets the owner refine it when the business needs something different.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <p className="text-[11.5px] font-semibold">Sensitive by default</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Reports, expenses, refunds and team management stay out of a cashier&apos;s
                    default view.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <p className="text-[11.5px] font-semibold">Owner control</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Grant or revoke individual permissions for a staff member without changing
                    everyone else&apos;s access.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-start gap-2 rounded-lg bg-muted/70 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
                <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Every business record is tenant-isolated on the server. The browser never decides
                which organisation&apos;s data it can read.
              </div>
            </div>
            <RolePreview />
          </div>
        </section>

        {/* Ghana */}
        <section className="py-16 sm:py-24">
          <div className="page-container">
            <div className="relative overflow-hidden rounded-2xl border border-[#1f4335] bg-[#0b1f19] px-6 py-10 text-[#e7efe9] sm:px-10 lg:px-14 lg:py-14">
              <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(#f6f7f3 0.7px, transparent 0.7px)", backgroundSize: "18px 18px" }} />
              <div className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full border border-[#e8c46d]/15" />
              <div className="pointer-events-none absolute -top-10 -right-2 size-52 rounded-full border border-[#e8c46d]/20" />
              <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium tracking-wide text-[#e8c46d] uppercase">
                    <MapPin className="size-3" /> Accra · Ghana
                  </span>
                  <h2 className="display-title mt-5 max-w-xl text-[clamp(2.1rem,4vw,3.5rem)] text-white">
                    Built around how
                    <br />
                    <span className="text-[#e8c46d]">Ghana actually trades.</span>
                  </h2>
                  <p className="mt-5 max-w-lg text-[13.5px] leading-[1.8] text-[#b7c8be]">
                    The cedi is the default. Mobile Money is a first-class payment method — recorded
                    accurately, with a reference. SMS invitations and alerts reach the phone your
                    team actually carries. Branches work the way your business works.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Banknote, title: "Cedi-native", copy: "Prices, receipts and reports in GH₵." },
                    { icon: Landmark, title: "Mobile Money", copy: "Record MoMo, bank, card and cash." },
                    { icon: Sparkles, title: "SMS built in", copy: "Invitations and alerts, provider-ready." },
                    { icon: Store, title: "Multi-branch", copy: "Separate stock, one clear business view." },
                  ].map((item) => (
                    <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <item.icon className="size-4 text-[#e8c46d]" strokeWidth={1.8} />
                      <p className="mt-3 text-[12px] font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-[#9fb4a7]">{item.copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-24 border-y border-border/70 bg-[#f0f3ee] py-16 sm:py-24">
          <div className="page-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Plans</p>
              <h2 className="display-title mt-3 text-[clamp(2.1rem,4vw,3.2rem)] text-ink">
                Start with the room you need.
              </h2>
              <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
                Every business starts as a conversation. Our team sets up your organisation,
                confirms your plan and sends the owner a secure invitation. There is no public
                sign-up and no card details collected on this site.
              </p>
            </div>

            {plans.length > 0 ? (
              <div className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
                {plans.map((plan) => {
                  const featured = plan.key === "business";
                  return (
                    <div
                      key={plan.key}
                      className={`relative flex flex-col rounded-xl border p-5 ${
                        featured
                          ? "border-[#1c4b3b] bg-[#0b1f19] text-[#e9f0ea] shadow-[0_20px_45px_-20px_rgb(11_31_25/60%)]"
                          : "border-border bg-card text-foreground shadow-[var(--shadow-card)]"
                      }`}
                    >
                      {featured ? (
                        <span className="absolute -top-2.5 left-5 rounded-full bg-gold px-2 py-0.5 text-[9px] font-semibold tracking-wide text-[#241a05] uppercase">
                          Most chosen
                        </span>
                      ) : null}
                      <p className={`text-[12px] font-semibold ${featured ? "text-[#e8c46d]" : "text-primary"}`}>
                        {plan.name}
                      </p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="font-heading text-[30px] font-semibold tracking-[-0.04em] tabular">
                          {plan.priceMonthly === "0.00" ? "Free" : formatMoney(plan.priceMonthly)}
                        </span>
                        {plan.priceMonthly !== "0.00" ? (
                          <span className={`text-[10px] ${featured ? "text-[#9fb4a7]" : "text-muted-foreground"}`}>/ month</span>
                        ) : null}
                      </div>
                      <p className={`mt-2 min-h-9 text-[11px] leading-relaxed ${featured ? "text-[#9fb4a7]" : "text-muted-foreground"}`}>
                        {plan.description}
                      </p>
                      <div className={`my-4 h-px ${featured ? "bg-white/10" : "bg-border"}`} />
                      <ul className="flex-1 space-y-2">
                        {(plan.features ?? []).map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-[11.5px] leading-relaxed">
                            <Check
                              className={`mt-0.5 size-3 shrink-0 ${featured ? "text-[#e8c46d]" : "text-primary"}`}
                              strokeWidth={2.7}
                            />
                            <span className={featured ? "text-[#c4d2c8]" : "text-muted-foreground"}>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={featured ? "gold" : "outline"}
                        size="sm"
                        className="mt-5 w-full"
                        render={<a href={`${ACCESS_MAILTO}%0APlan:%20${encodeURIComponent(plan.name)}`} />}
                       nativeButton={false}>
                        Request this plan
                        <ArrowUpRight className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mx-auto mt-10 max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
                <p className="font-heading text-lg font-semibold">Plans are arranged with our team.</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Contact us for the current plan list and the right fit for your business.
                </p>
                <Button className="mt-5" render={<a href={ACCESS_MAILTO} />} nativeButton={false}>
                  Request access
                </Button>
              </div>
            )}

            <p className="mt-6 text-center text-[11px] text-muted-foreground">
              Plan changes and subscription billing are managed by the Madetom platform team.
              Prices shown in Ghana cedis.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-24">
          <div className="page-container">
            <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-center sm:px-12 sm:py-16">
              <div className="pointer-events-none absolute inset-0 opacity-[0.09]" style={{ backgroundImage: "linear-gradient(#f6f7f3 1px, transparent 1px), linear-gradient(90deg, #f6f7f3 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
              <div className="relative mx-auto max-w-2xl">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-[#e8c46d] uppercase">Ready when you are</p>
                <h2 className="display-title mt-4 text-[clamp(2.2rem,4.5vw,3.8rem)] text-white">
                  Let&apos;s put your trade
                  <br />
                  under control.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-[13.5px] leading-relaxed text-[#c4d5ca]">
                  Tell us about your business. We&apos;ll create your Madetom organisation, set up the
                  plan and send a secure setup invitation to the owner.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    variant="gold"
                    size="lg"
                    className="h-11 px-5"
                    render={<a href={ACCESS_MAILTO} />}
                   nativeButton={false}>
                    Talk to the Madetom team
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-11 border-white/20 bg-transparent px-5 text-white hover:border-white/30 hover:bg-white/10 hover:text-white"
                    render={<Link href="/login" />}
                   nativeButton={false}>
                    Sign in
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-[#fbfcf9]">
        <div className="page-container py-12">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-muted-foreground">
                Your trade, under control. Point of sale, inventory and business reporting for
                Ghanaian businesses, built by SamTech Labs.
              </p>
              <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MapPin className="size-3.5 text-primary" /> Accra, Ghana
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-ink uppercase">Product</p>
              <ul className="mt-3 space-y-2 text-[12px] text-muted-foreground">
                <li><a className="hover:text-foreground" href="#product">Point of sale</a></li>
                <li><a className="hover:text-foreground" href="#operations">Inventory</a></li>
                <li><a className="hover:text-foreground" href="#roles">Roles & access</a></li>
                <li><a className="hover:text-foreground" href="#pricing">Plans</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-ink uppercase">Account</p>
              <ul className="mt-3 space-y-2 text-[12px] text-muted-foreground">
                <li><Link className="hover:text-foreground" href="/login">Sign in</Link></li>
                <li><Link className="hover:text-foreground" href="/forgot-password">Password help</Link></li>
                <li>
                  <a className="hover:text-foreground" href={ACCESS_MAILTO}>Request access</a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-ink uppercase">Company</p>
              <ul className="mt-3 space-y-2 text-[12px] text-muted-foreground">
                <li>SamTech Labs</li>
                <li><a className="hover:text-foreground" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
                <li><Link className="hover:text-foreground" href="/privacy">Privacy</Link></li>
                <li><Link className="hover:text-foreground" href="/terms">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col justify-between gap-2 border-t border-border pt-5 text-[10.5px] text-muted-foreground sm:flex-row">
            <p>© {copyrightYear} SamTech Labs. Madetom is a SamTech Labs product.</p>
            <p className="flex items-center gap-1.5">
              <span
                className={`inline-block size-1.5 rounded-full ${inMaintenance ? "bg-warning" : "bg-success"}`}
              />
              {inMaintenance ? "Maintenance mode" : "Systems operational"}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

