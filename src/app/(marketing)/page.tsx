import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  CircleCheck,
  CreditCard,
  Landmark,
  LockKeyhole,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Users,
  X,
} from "lucide-react";
import { getCopyrightYear } from "@/lib/copyright";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import {
  InventoryPreview,
  LocationBadge,
  PosPreview,
  RolePreview,
} from "@/components/marketing/product-preview";
import {
  formatLimit,
  formatPlanPrice,
  getAllPlans,
  planHasFeature,
  type PlanKey,
} from "@/lib/subscription/plans";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@samtechlabs.com";

const features = [
  {
    icon: Store,
    title: "A till that keeps up",
    description:
      "Keyboard-first checkout, barcode search, split payments and receipts that print or send in seconds.",
  },
  {
    icon: Boxes,
    title: "Stock that stays honest",
    description:
      "Every sale, purchase, transfer and adjustment moves one stock count. Low-stock alerts reach you before the shelf is empty.",
  },
  {
    icon: Truck,
    title: "Purchasing without guesswork",
    description:
      "Record supplier purchases, track what you owe and see the real cost of what is sitting on your shelves.",
  },
  {
    icon: Users,
    title: "Customers and credit",
    description:
      "Keep customer records, follow up on balances and give regulars the service that brings them back.",
  },
  {
    icon: BarChart3,
    title: "Reports you can act on",
    description:
      "Daily sales, profit by product, branch comparisons and stock valuation — without rebuilding a spreadsheet.",
  },
  {
    icon: ShieldCheck,
    title: "The right access for every role",
    description:
      "Owners see everything. Managers run the shop. Cashiers see the till. Sensitive numbers stay where they belong.",
  },
];

const trustPoints = [
  { icon: Banknote, label: "Prices in Ghana cedis" },
  { icon: MessageSquare, label: "SMS alerts built in" },
  { icon: MapPin, label: "Made for Ghanaian shops" },
];

const ghanaPoints = [
  {
    icon: CreditCard,
    title: "Pay how Ghana pays",
    description:
      "Take cash, Mobile Money, bank transfer and card at the counter. Every method lands in the same sale record.",
  },
  {
    icon: Landmark,
    title: "Built around the cedi",
    description:
      "GHS pricing, cedis on receipts and reports that match the way your business actually trades.",
  },
  {
    icon: MessageSquare,
    title: "Reach people where they are",
    description:
      "Invitations, password resets and stock alerts arrive by SMS on the phone your team already carries.",
  },
  {
    icon: Sparkles,
    title: "One workspace, many branches",
    description:
      "Start with one shop and add branches as you grow. Stock and reporting stay in one place.",
  },
];

const steps = [
  {
    step: "01",
    title: "Create your workspace",
    description:
      "Tell us about your business, choose a plan and pay securely with Paystack. It takes one sitting.",
  },
  {
    step: "02",
    title: "Add your products",
    description:
      "Create products one by one, or import a CSV on Growth and Business. Set prices, stock and low-stock levels.",
  },
  {
    step: "03",
    title: "Invite your team and sell",
    description:
      "Add managers, cashiers and inventory staff, open the till and start recording every sale.",
  },
];

const comparisonRows: {
  label: string;
  featureKey?: string;
  value?: (plan: ReturnType<typeof getAllPlans>[number]) => string;
}[] = [
  { label: "Products", value: (plan) => formatLimit(plan.maxProducts) },
  { label: "Staff accounts", value: (plan) => plan.maxStaff.toLocaleString() },
  { label: "Branches", value: (plan) => plan.maxBranches.toLocaleString() },
  { label: "Included SMS credits", value: (plan) => `${plan.smsCredits.toLocaleString()} / month` },
  { label: "Profit reporting", featureKey: "reports.profit" },
  { label: "CSV import and export", featureKey: "reports.csvImport" },
  { label: "Customer debt tracking", featureKey: "customers.debtTracking" },
  { label: "Branch-level reporting", featureKey: "reports.branchLevel" },
  { label: "Stock transfers between branches", featureKey: "inventory.transfer" },
  { label: "Advanced branch analytics", featureKey: "reports.branchAnalytics" },
  { label: "Comprehensive audit logs", featureKey: "audit.comprehensive" },
  { label: "Priority support", featureKey: "support.priority" },
];

const planHighlights: Record<PlanKey, string[]> = {
  starter: [
    "pos.use",
    "products.manage",
    "inventory.adjust",
    "customers.manage",
    "reports.view",
    "staff.basicPermissions",
  ],
  growth: [
    "reports.profit",
    "reports.csvImport",
    "customers.debtTracking",
    "reports.branchLevel",
    "dashboard.advanced",
    "reports.advancedSales",
  ],
  business: [
    "inventory.transfer",
    "reports.branchAnalytics",
    "audit.comprehensive",
    "reports.organisation",
    "staff.advancedRoleManagement",
    "support.priority",
  ],
};

const faqs = [
  {
    question: "How do I pay for my subscription?",
    answer:
      "Checkout runs through Paystack, so you can pay with a debit card, Mobile Money or bank transfer in Ghana cedis. Madetom never stores your card details. Your workspace activates as soon as the payment is verified on our server.",
  },
  {
    question: "Can I change my plan later?",
    answer:
      "Yes. The business owner can upgrade or renew from the Plan & usage page inside the workspace. If you move to a lower plan, your existing records are preserved; you simply cannot create new records beyond the lower plan's limits until you archive some or upgrade again.",
  },
  {
    question: "What happens if I reach a limit?",
    answer:
      "Madetom checks product, staff and branch limits on the server every time you create something. When you reach a limit, new records of that type are blocked with a clear message and an upgrade path. Nothing you already have is deleted or hidden.",
  },
  {
    question: "What happens if my subscription expires?",
    answer:
      "Your records stay exactly where they are. The workspace becomes read-only — you can still view and export your data — and new changes pause until the plan is renewed. Nothing is deleted and no records are locked away.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. Madetom runs in the browser on the devices you already have. Open it on a shop computer, laptop or tablet, sign in and start selling. A stable internet connection is enough.",
  },
  {
    question: "Is SMS included?",
    answer:
      "Every plan includes a monthly allowance of SMS credits for invitations, password resets and stock alerts. If you send more, you can top up the SMS wallet separately without changing your subscription.",
  },
  {
    question: "Can I import my existing product list?",
    answer:
      "Yes, on the Growth and Business plans. Upload a CSV with your product names, prices, stock and low-stock levels, and Madetom will validate the file before adding anything.",
  },
  {
    question: "Can I use Madetom for more than one branch?",
    answer:
      "Starter covers one branch, Growth covers up to three and Business covers up to five. Stock transfers and branch analytics are available on Business. You can add branches at any time, subject to your plan limit.",
  },
];

function CheckCell({ included }: { included: boolean }) {
  return included ? (
    <span className="inline-flex items-center justify-center text-primary">
      <Check className="size-4" aria-hidden />
      <span className="sr-only">Included</span>
    </span>
  ) : (
    <span className="inline-flex items-center justify-center text-muted-foreground/60">
      <X className="size-4" aria-hidden />
      <span className="sr-only">Not included</span>
    </span>
  );
}

export default async function LandingPage() {
  const copyrightYear = await getCopyrightYear();
  const plans = getAllPlans();

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0b1f19]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(232,196,109,0.14)_0.8px,transparent_0.8px)] [background-size:24px_24px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-40 top-0 size-[560px] rounded-full bg-[radial-gradient(circle,rgba(20,107,80,0.55),transparent_65%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-24 size-[500px] rounded-full bg-[radial-gradient(circle,rgba(200,150,45,0.2),transparent_65%)]"
          />

          <div className="page-container relative grid gap-10 py-9 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-12 lg:py-12">
            <div>
              <Badge
                variant="gold"
                className="inline-flex items-center gap-1.5 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
              >
                <Sparkles className="size-3" aria-hidden />
                Built for Ghanaian shops
              </Badge>

              <h1 className="display-title mt-4 text-[clamp(2.5rem,4.6vw,4rem)] leading-[1.02] text-[#f5f8f4] text-balance">
                Your shop,
                <br />
                <span className="text-[#e8c46d]">finally under control.</span>
              </h1>

              <p className="mt-4 max-w-xl text-[15px] leading-[1.65] text-[#a9bdb2] text-pretty">
                Point of sale, inventory, purchasing, staff and reporting in one calm system.
                Sell faster, know what is on your shelves and see the numbers that actually move
                your business.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  variant="gold"
                  className="h-11 px-6 text-[14px]"
                  render={<Link href="/signup" />}
                  nativeButton={false}
                >
                  Start your workspace
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-11 border border-[#2c4f41] px-6 text-[14px] text-[#dce8e0] hover:bg-[#16372b] hover:text-white"
                  render={<a href="#pricing" />}
                  nativeButton={false}
                >
                  See plans and pricing
                </Button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#24463a] pt-4 text-[11.5px] text-[#8fa79b]">
                <span className="inline-flex items-center gap-1.5">
                  <CircleCheck className="size-3.5 text-[#d9b661]" aria-hidden /> Pay monthly in GHS
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LockKeyhole className="size-3.5 text-[#d9b661]" aria-hidden /> Paystack-secured
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="size-3.5 text-[#d9b661]" aria-hidden /> Cancel any time
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[540px] lg:mx-0">
              <div
                aria-hidden
                className="absolute -top-4 -right-4 hidden size-28 rotate-12 rounded-2xl border border-[#d9b661]/25 bg-[#e8c46d]/8 sm:block"
              />
              <div
                aria-hidden
                className="absolute -bottom-4 -left-4 hidden h-[82%] w-[92%] rounded-[2rem] border border-[#d9b661]/25 sm:block"
              />

              <div className="relative h-[420px] overflow-hidden rounded-[1.8rem] border border-[#2c4f41] bg-[#112b21] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] sm:h-[490px] lg:h-[530px]">
                <img
                  src="https://getnovas.com/wp-content/uploads/2026/08/stock-count-doesnt-match-sales-records.png"
                  alt="Ghanaian shop owner at her store counter"
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07140f]/90 via-[#07140f]/15 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/10 bg-[#0b1f19]/80 px-4 py-2.5 backdrop-blur-md">
                  <p className="text-[9.5px] font-semibold tracking-[0.14em] text-[#d9b661] uppercase">
                    Built for the counter
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#e7efe9]">
                    Sell, track stock and see the day&apos;s numbers in one place.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="py-20 sm:py-24">
          <div className="page-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Everything in one place</p>
              <h2 className="display-title mt-3 text-[clamp(2rem,4.2vw,3rem)] text-ink text-balance">
                The counter, the store room and the numbers — connected.
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                No more notebooks that disagree with the till. Madetom keeps one working picture
                of your business, from the first sale of the day to the stock count at closing.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-[#cdd8cf] hover:shadow-[var(--shadow-raised)]"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="size-5" strokeWidth={1.8} aria-hidden />
                  </span>
                  <h3 className="mt-5 font-heading text-[16px] font-semibold tracking-[-0.015em] text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-[1.7] text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Point of sale */}
        <section id="product" className="scroll-mt-24 border-y border-border/60 bg-[#fbfcf9] py-20 sm:py-24">
          <div className="page-container grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow">Point of sale</p>
              <h2 className="display-title mt-3 text-[clamp(2rem,4.2vw,2.9rem)] text-ink text-balance">
                A till your cashiers can learn before the queue gets long.
              </h2>
              <p className="mt-4 text-[14px] leading-[1.75] text-muted-foreground">
                Search or scan, take payment and print a receipt. Every sale updates stock and the
                day&apos;s totals in the same motion — no end-of-day reconciliation.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Barcode search and keyboard shortcuts for fast checkout",
                  "Cash, Mobile Money, bank transfer and card in one sale",
                  "Part payments and customer balances where you allow them",
                  "Receipts that print, send or stay attached to the sale",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-foreground">
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <Button variant="outline" render={<Link href="/signup?plan=starter" />} nativeButton={false}>
                  Start selling
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
            <div className="relative">
              <div aria-hidden className="absolute -inset-4 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_top,rgb(15_92_71/10%),transparent_65%)]" />
              <PosPreview />
            </div>
          </div>
        </section>

        {/* Inventory */}
        <section id="operations" className="scroll-mt-24 py-20 sm:py-24">
          <div className="page-container grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="lg:order-2">
              <p className="eyebrow">Inventory & purchasing</p>
              <h2 className="display-title mt-3 text-[clamp(2rem,4.2vw,2.9rem)] text-ink text-balance">
                Know what you have before a customer asks.
              </h2>
              <p className="mt-4 text-[14px] leading-[1.75] text-muted-foreground">
                Products, suppliers, purchases and stock movements share one ledger. When stock
                runs low, Madetom tells you — by SMS if you want it on your phone.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "One stock count across every active branch",
                  "Low-stock and out-of-stock alerts before you lose a sale",
                  "Supplier purchases and balances in the same place",
                  "CSV import on Growth and Business for existing catalogues",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-foreground">
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <Button variant="outline" render={<Link href="/signup?plan=growth" />} nativeButton={false}>
                  Set up your inventory
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
            <div className="lg:order-1">
              <InventoryPreview />
            </div>
          </div>
        </section>

        {/* Reports & roles */}
        <section id="reports" className="scroll-mt-24 border-y border-border/60 bg-[#fbfcf9] py-20 sm:py-24">
          <div className="page-container grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow">Reports & team</p>
              <h2 className="display-title mt-3 text-[clamp(2rem,4.2vw,2.9rem)] text-ink text-balance">
                The whole business, without asking everyone for numbers.
              </h2>
              <p className="mt-4 text-[14px] leading-[1.75] text-muted-foreground">
                See what sold, what it cost you and which branch is pulling ahead. Give each person
                exactly the access their job needs, and keep an audit trail of sensitive changes.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Sales and profit", detail: "By day, product and branch" },
                  { label: "Stock valuation", detail: "What is sitting on the shelf" },
                  { label: "Team performance", detail: "Who is selling what" },
                  { label: "Audit trail", detail: "Who changed what, and when" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-card p-3.5">
                    <p className="text-[12px] font-semibold text-ink">{item.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7">
                <Button variant="outline" render={<Link href="/signup?plan=business" />} nativeButton={false}>
                  See the full picture
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
            <div>
              <RolePreview />
            </div>
          </div>
        </section>

        {/* Ghana section */}
        <section className="py-20 sm:py-24">
          <div className="page-container">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
              <div>
                <p className="eyebrow">Made for here</p>
                <h2 className="display-title mt-3 text-[clamp(2rem,4.2vw,2.9rem)] text-ink text-balance">
                  Software that understands a Ghanaian shop.
                </h2>
                <p className="mt-4 max-w-md text-[14px] leading-[1.75] text-muted-foreground">
                  Madetom is built by SamTech Labs for provision stores, supermarkets,
                  pharmacies, distributors and the many kinds of retail in between.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <LocationBadge>Accra</LocationBadge>
                  <LocationBadge>Kumasi</LocationBadge>
                  <LocationBadge>Takoradi</LocationBadge>
                  <LocationBadge>Tamale</LocationBadge>
                </div>
                <div className="mt-7">
                  <Button render={<Link href="/signup" />} nativeButton={false}>
                    Create your workspace
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {ghanaPoints.map((point) => (
                  <article key={point.title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-gold-soft text-[#8a641a]">
                      <point.icon className="size-4" strokeWidth={1.9} aria-hidden />
                    </span>
                    <h3 className="mt-4 font-heading text-[14.5px] font-semibold text-ink">{point.title}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-[1.65] text-muted-foreground">
                      {point.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border/60 bg-[#0b1f19] py-20 text-[#e7efe9] sm:py-24">
          <div className="page-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[10.5px] font-semibold tracking-[0.16em] text-[#d9b661] uppercase">
                From sign-up to first sale
              </p>
              <h2 className="display-title mt-3 text-[clamp(2rem,4.2vw,3rem)] text-[#f5f8f4] text-balance">
                One sitting. Then you are open.
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-[#a9bdb2]">
                No sales call, no waiting for an invitation. Create the workspace, pay securely and
                start adding your products.
              </p>
            </div>

            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {steps.map((item) => (
                <li key={item.step} className="rounded-2xl border border-[#24463a] bg-[#112b21] p-6">
                  <span className="font-mono text-[12px] font-semibold tracking-[0.08em] text-[#d9b661]">
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-heading text-[17px] font-semibold text-[#edf3ee]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-[1.7] text-[#8fa79b]">{item.description}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 text-center">
              <Button variant="gold" size="lg" className="h-11 px-6" render={<Link href="/signup" />} nativeButton={false}>
                Start your workspace
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-y border-border/60 bg-[#fbfcf9]">
          <div className="page-container grid gap-3 py-5 sm:grid-cols-3">
            {trustPoints.map((point) => (
              <div key={point.label} className="flex items-center gap-2.5 text-[12.5px] font-medium text-muted-foreground">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/7 text-primary">
                  <point.icon className="size-3.5" strokeWidth={1.9} aria-hidden />
                </span>
                {point.label}
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-24 py-20 sm:py-24">
          <div className="page-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Plans & pricing</p>
              <h2 className="display-title mt-3 text-[clamp(2rem,4.2vw,3rem)] text-ink text-balance">
                Simple pricing in cedis.
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                Every plan includes the till, product management, stock adjustments and core
                reports. Choose the capacity that fits the shop you are running today.
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => {
                const highlighted = plan.key === "growth";
                const highlights = planHighlights[plan.key]
                  .map((key) => plan.features.find((feature) => feature.key === key))
                  .filter((feature): feature is NonNullable<typeof feature> => Boolean(feature));

                return (
                  <article
                    key={plan.key}
                    className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)] ${
                      highlighted
                        ? "border-primary ring-1 ring-primary/20 lg:-mt-3 lg:mb-3"
                        : "border-border"
                    }`}
                  >
                    {highlighted ? (
                      <Badge variant="gold" className="absolute -top-3 left-6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
                        Most popular
                      </Badge>
                    ) : null}

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-heading text-[19px] font-semibold tracking-[-0.02em] text-ink">
                          {plan.name}
                        </h3>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                          {plan.description}
                        </p>
                      </div>
                      {plan.key === "business" ? (
                        <Badge variant="default" className="shrink-0">
                          Unlimited products
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-5 flex items-end gap-1.5">
                      <span className="font-heading text-[34px] leading-none font-semibold tracking-[-0.04em] text-ink tabular">
                        {formatPlanPrice(plan.priceMonthly)}
                      </span>
                      <span className="pb-1 text-[12px] text-muted-foreground">/ month</span>
                    </div>

                    <dl className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/35 p-3">
                      <div>
                        <dt className="text-[9.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                          Products
                        </dt>
                        <dd className="mt-0.5 text-[12px] font-semibold text-ink">{formatLimit(plan.maxProducts)}</dd>
                      </div>
                      <div>
                        <dt className="text-[9.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                          Staff
                        </dt>
                        <dd className="mt-0.5 text-[12px] font-semibold text-ink">{plan.maxStaff}</dd>
                      </div>
                      <div>
                        <dt className="text-[9.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                          Branches
                        </dt>
                        <dd className="mt-0.5 text-[12px] font-semibold text-ink">{plan.maxBranches}</dd>
                      </div>
                    </dl>

                    <ul className="mt-5 flex-1 space-y-2.5">
                      {plan.key !== "starter" ? (
                        <li className="flex items-start gap-2 text-[12.5px] leading-relaxed font-medium text-foreground">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                          Everything in {plan.key === "growth" ? "Starter" : "Growth"}
                        </li>
                      ) : null}
                      {highlights.map((feature) => (
                        <li key={feature.key} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-foreground">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                          {feature.label}
                        </li>
                      ))}
                      <li className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
                        <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                        {plan.smsCredits.toLocaleString()} SMS credits every month
                      </li>
                    </ul>

                    <Button
                      className="mt-6 h-10 w-full"
                      variant={highlighted ? "default" : "outline"}
                      render={<Link href={`/signup?plan=${plan.key}`} />}
                      nativeButton={false}
                    >
                      Start with {plan.name}
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </article>
                );
              })}
            </div>

            <p className="mx-auto mt-8 max-w-2xl text-center text-[11.5px] leading-relaxed text-muted-foreground">
              Prices are in Ghana cedis and billed monthly through Paystack. Included SMS credits
              reset each month; extra SMS top-ups are billed separately. Change or cancel your plan
              from the workspace at any time.
            </p>
          </div>
        </section>

        {/* Comparison */}
        <section className="border-y border-border/60 bg-[#fbfcf9] py-16 sm:py-20">
          <div className="page-container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="display-title text-[clamp(1.7rem,3.4vw,2.4rem)] text-ink text-balance">
                Compare every plan
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                The same core tools on every plan, with more capacity and deeper reporting as you
                grow.
              </p>
            </div>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
              <table className="w-full min-w-[680px]">
                <caption className="sr-only">Madetom plan comparison</caption>
                <thead>
                  <tr className="border-b border-border bg-muted/45">
                    <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                      What you get
                    </th>
                    {plans.map((plan) => (
                      <th key={plan.key} scope="col" className="px-4 py-3.5 text-center">
                        <span className="block font-heading text-[13px] font-semibold text-ink">{plan.name}</span>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                          {formatPlanPrice(plan.priceMonthly)}/mo
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row" className="px-5 py-3 text-left text-[12.5px] font-medium text-foreground">
                        {row.label}
                      </th>
                      {plans.map((plan) => (
                        <td key={plan.key} className="px-4 py-3 text-center">
                          {row.featureKey ? (
                            <CheckCell included={planHasFeature(plan.key, row.featureKey)} />
                          ) : (
                            <span className="text-[12px] font-medium text-foreground tabular">
                              {row.value ? row.value(plan) : "—"}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
          <div className="page-container">
            <div className="mx-auto max-w-3xl">
              <div className="text-center">
                <p className="eyebrow">Questions</p>
                <h2 className="display-title mt-3 text-[clamp(2rem,4.2vw,2.9rem)] text-ink text-balance">
                  Before you start.
                </h2>
                <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                  Straight answers about payment, plans and what happens to your data.
                </p>
              </div>

              <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
                {faqs.map((faq) => (
                  <details key={faq.question} className="group px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                      {faq.question}
                      <ChevronDown
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <p className="mt-2.5 pr-8 text-[12.5px] leading-[1.75] text-muted-foreground">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>

              <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
                Still have a question?{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Madetom question`}
                  className="font-semibold text-primary hover:underline"
                >
                  Email the team
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-20 sm:pb-24">
          <div className="page-container">
            <div className="relative overflow-hidden rounded-3xl bg-[#0b1f19] px-6 py-12 text-center sm:px-12 sm:py-16">
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(232,196,109,0.16)_0.8px,transparent_0.8px)] [background-size:22px_22px]" />
              <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(200,150,45,0.18),transparent_65%)]" />
              <div className="relative mx-auto max-w-2xl">
                <p className="text-[10.5px] font-semibold tracking-[0.16em] text-[#d9b661] uppercase">
                  Your trade, under control
                </p>
                <h2 className="display-title mt-3 text-[clamp(2rem,4.6vw,3.2rem)] text-[#f5f8f4] text-balance">
                  Open the till with a clearer picture.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-[14px] leading-[1.75] text-[#a9bdb2]">
                  Create your workspace today, pay securely in cedis and start recording sales
                  with stock and reports that stay in step.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button size="lg" variant="gold" className="h-11 px-6" render={<Link href="/signup" />} nativeButton={false}>
                    Start your workspace
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-11 px-6 text-[#dce8e0] hover:bg-[#16372b] hover:text-white"
                    render={<a href="#pricing" />}
                    nativeButton={false}
                  >
                    Compare plans
                  </Button>
                </div>
                <p className="mt-5 text-[11.5px] text-[#7c9488]">
                  Monthly billing · Paystack-secured · Your data stays yours
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-[#fbfcf9] pt-16 pb-10">
        <div className="page-container">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-muted-foreground">
                Your trade, under control. Point of sale, inventory and business reporting for
                Ghanaian businesses, built by SamTech Labs.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">GHS billing</Badge>
                <Badge variant="outline">Paystack secured</Badge>
              </div>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Product</p>
              <ul className="space-y-2 text-[12px] text-muted-foreground">
                <li><a href="#product" className="transition-colors hover:text-foreground">Point of sale</a></li>
                <li><a href="#operations" className="transition-colors hover:text-foreground">Inventory</a></li>
                <li><a href="#reports" className="transition-colors hover:text-foreground">Reports</a></li>
                <li><a href="#pricing" className="transition-colors hover:text-foreground">Plans & pricing</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Account</p>
              <ul className="space-y-2 text-[12px] text-muted-foreground">
                <li><Link href="/signup" className="transition-colors hover:text-foreground">Create workspace</Link></li>
                <li><Link href="/login" className="transition-colors hover:text-foreground">Sign in</Link></li>
                <li><Link href="/forgot-password" className="transition-colors hover:text-foreground">Password help</Link></li>
                <li><a href="#faq" className="transition-colors hover:text-foreground">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Company</p>
              <ul className="space-y-2 text-[12px] text-muted-foreground">
                <li>SamTech Labs</li>
                <li><a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-foreground">{CONTACT_EMAIL}</a></li>
                <li><Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link></li>
                <li><Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-2 border-t border-border pt-8 text-[10.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {copyrightYear} SamTech Labs. Madetom is a SamTech Labs product.</p>
            <div className="flex items-center gap-1.5">
              <span className="flex size-1.5 rounded-full bg-success" />
              <span>Systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
