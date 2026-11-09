import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { getCopyrightYear } from "@/lib/copyright";

export type LegalSection = { heading: string; body: string[] };

export async function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  const year = await getCopyrightYear();

  return (
    <div className="min-h-screen bg-[#f6f7f3]">
      <MarketingHeader contactEmail="hello@samtechlabs.com" />

      <main className="page-container py-14 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">Legal</p>
          <h1 className="display-title mt-3 text-[clamp(2.2rem,4.6vw,3.4rem)] text-ink">{title}</h1>
          <p className="mt-3 text-[12px] text-muted-foreground">Last updated {updated}</p>
          <p className="mt-6 text-[14px] leading-[1.8] text-muted-foreground">{intro}</p>

          <div className="mt-10 space-y-9">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-heading text-[19px] font-semibold tracking-[-0.02em] text-ink">
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-[13.5px] leading-[1.85] text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              This summary explains how Madetom handles data in practice. It is not a substitute for
              the signed service agreement with your business. If the two differ, the signed
              agreement is what applies. Ask SamTech Labs for the full agreement.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:underline"
            >
              Back to Madetom
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-[#fbfcf9]">
        <div className="page-container py-8">
          <Logo />
          <p className="mt-3 text-[11px] text-muted-foreground">
            © {year} SamTech Labs. Madetom is a SamTech Labs product.
          </p>
        </div>
      </footer>
    </div>
  );
}
