import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Store, Truck } from "lucide-react";
import { getCopyrightYear } from "@/lib/copyright";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@samtechlabs.com";
const ACCESS_MAILTO = `mailto:${CONTACT_EMAIL}?subject=Madetom access request&body=Hello SamTech Labs,%0A%0AI would like to set up Madetom for my business.%0A%0ABusiness name:%0ALocation:%0AWhat we sell:%0A%0AThank you.`;

const features = [
  {
    icon: Store,
    title: "Point of sale",
    description: "Fast, keyboard-first checkout with barcode search, receipts and Mobile Money.",
  },
  {
    icon: Truck,
    title: "Inventory",
    description: "Track stock across branches, get low-stock alerts and record every movement.",
  },
  {
    icon: ShieldCheck,
    title: "Roles & access",
    description: "Owners, managers and cashiers see only what their role allows.",
  },
  {
    icon: Sparkles,
    title: "SMS built in",
    description: "Invitations, password resets and stock alerts reach your team by SMS.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "0",
    period: "/ month",
    description: "For a single shop getting started.",
    features: ["One branch", "Up to 5 staff", "SMS included", "Email support"],
    featured: false,
  },
  {
    name: "Business",
    price: "150",
    period: "/ month",
    description: "For growing shops with multiple branches.",
    features: ["Up to 5 branches", "Up to 20 staff", "SMS included", "Priority support"],
    featured: true,
  },
];

export default async function LandingPage() {
  const copyrightYear = await getCopyrightYear();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="page-container flex h-[64px] items-center justify-between">
          <Link href="/" aria-label="Madetom home">
            <Logo />
          </Link>
          <Button variant="outline" size="sm" render={<Link href="/login" />} nativeButton={false}>
            Sign in
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative px-4 pt-12 pb-32 sm:px-6 sm:pt-16 sm:pb-40 lg:px-8">
          <div className="page-container max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="space-y-6">
                <Badge variant="gold" className="inline-flex">
                  Built for Ghanaian shops
                </Badge>
                <h1 className="display-title text-[clamp(2.75rem,5vw,4.25rem)] leading-[1.05] text-ink mb-4">
                  Your trade,<br />
                  <span className="text-primary">under control.</span>
                </h1>
                <p className="text-[16px] leading-relaxed text-muted-foreground max-w-lg">
                  Point of sale, inventory and reporting in one calm system. Built for provision
                  stores, supermarkets and shops across Ghana.
                </p>
                <Button size="lg" variant="gold" className="w-full sm:w-auto" render={<Link href="/login" />} nativeButton={false}>
                  Sign in
                  <ArrowRight className="size-4" />
                </Button>
                <p className="text-[12px] text-muted-foreground mt-2">
                  Access is by invitation — organisations are added by your Madetom administrator.
                </p>
              </div>

              <div className="relative h-[500px] lg:h-[600px]">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-xl" />
                <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-[var(--shadow-float)]">
                  <img
                    src="https://getnovas.com/wp-content/uploads/2026/08/stock-count-doesnt-match-sales-records.png"
                    alt="Ghanaian market seller arranging goods at her shop"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14231c]/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-6 sm:p-8 w-full">
                    <h3 className="font-heading text-[clamp(1.25rem,2vw,1.5rem)] font-semibold text-white tracking-tight">
                      Adabraka Provisions
                    </h3>
                    <p className="mt-1 text-sm text-[#d9e1d7]">
                      Accra, Ghana &bull; Open since 2018
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border/60 bg-secondary/40 py-20 sm:py-28">
          <div className="page-container">
            <div className="text-center mb-16">
              <h2 className="display-title text-[clamp(2rem,4vw,2.75rem)] text-ink mb-4">Everything your shop needs</h2>
              <p className="text-muted-foreground">Simple tools that actually get used.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((feature) => (
                <Card key={feature.title} className="p-6 hover:shadow-raised transition-shadow">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/8 text-primary mb-4 shrink-0">
                    <feature.icon className="size-5" />
                  </div>
                  <CardTitle className="mb-2">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 sm:py-28">
          <div className="page-container max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="display-title text-[clamp(2rem,4vw,2.75rem)] text-ink mb-4">Get started in days</h2>
              <p className="text-muted-foreground">We set up your organisation and send the owner a secure invitation.</p>
            </div>
            <ol className="grid md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Tell us about your shop", description: "Send us your business name, location and what you sell." },
                { step: "2", title: "We create your workspace", description: "Our team sets up your organisation and plan." },
                { step: "3", title: "Owner sets up", description: "The owner opens a secure link and finishes setup." },
              ].map((step) => (
                <li key={step.step} className="flex flex-col gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground font-heading text-sm font-semibold">
                    {step.step}
                  </span>
                  <h3 className="font-heading text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-border/60 bg-background py-20 sm:py-28">
          <div className="page-container">
            <div className="text-center mb-16">
              <h2 className="display-title text-[clamp(2rem,4vw,2.75rem)] text-ink mb-4">Simple, honest pricing</h2>
              <p className="text-muted-foreground">No per-transaction fees. No hidden costs.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {plans.map((plan) => (
                <Card key={plan.name} className={`p-8 relative ${plan.featured ? "border-primary bg-primary text-primary-foreground shadow-raised" : ""}`}>
                  {plan.featured && (
                    <Badge variant="gold" className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-wider text-[#241a05] bg-gold">
                      Most popular
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className={plan.featured ? "text-white" : "text-ink"}>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-6">
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="font-heading text-[40px] font-bold">{plan.price}</span>
                      <span className="text-sm font-medium">{plan.period}</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted/50 text-sm font-semibold">
                            ✓
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button size="lg" className="w-full" render={<a href={ACCESS_MAILTO} />} nativeButton={false}>
                      Request this plan
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-12 text-center text-xs text-muted-foreground">
              Plan changes and billing are managed by the Madetom team. Prices in Ghana cedis (GH₵).
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background pt-16 pb-10">
        <div className="page-container">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-muted-foreground">
                Your trade, under control. Point of sale, inventory and business reporting for
                Ghanaian businesses, built by SamTech Labs.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-3">Product</p>
              <ul className="space-y-2 text-[12px] text-muted-foreground">
                <li><a href="#product" className="hover:text-foreground transition-colors">Point of sale</a></li>
                <li><a href="#operations" className="hover:text-foreground transition-colors">Inventory</a></li>
                <li><a href="#roles" className="hover:text-foreground transition-colors">Roles & access</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Plans</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-3">Account</p>
              <ul className="space-y-2 text-[12px] text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link></li>
                <li><Link href="/forgot-password" className="hover:text-foreground transition-colors">Password help</Link></li>
                <li><a href={ACCESS_MAILTO} className="hover:text-foreground transition-colors">Request access</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-3">Company</p>
              <ul className="space-y-2 text-[12px] text-muted-foreground">
                <li>SamTech Labs</li>
                <li><a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground transition-colors">{CONTACT_EMAIL}</a></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-border pt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[10.5px] text-muted-foreground">
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
