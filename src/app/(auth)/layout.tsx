import Link from "next/link";
import { ArrowUpRight, CircleCheck, LockKeyhole, ReceiptText } from "lucide-react";
import { Logo, LogoLockup } from "@/components/brand/logo";

/**
 * Auth pages read the request (search params, session cookies) at request
 * time, so they cannot be prerendered into a static shell.
 */

const promises = [
  {
    icon: ReceiptText,
    title: "Every sale recorded",
    description: "Cash, Mobile Money and transfer payments written straight to the ledger.",
  },
  {
    icon: CircleCheck,
    title: "Stock you can trust",
    description: "Sales, purchases and adjustments keep one honest stock count.",
  },
  {
    icon: LockKeyhole,
    title: "Access with boundaries",
    description: "Your team sees their work. Sensitive numbers stay with you.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-[#f7f8f4] lg:grid lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
      <aside className="relative hidden overflow-hidden bg-[#0a1d17] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(232,196,109,0.16)_0.8px,transparent_0.8px)] [background-size:22px_22px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-32 size-[480px] rounded-full bg-[radial-gradient(circle,rgba(200,150,45,0.18),transparent_65%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -left-24 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(20,107,80,0.5),transparent_65%)]"
        />

        <div className="relative">
          <Link href="/" aria-label="Madetom home" className="inline-flex rounded-md">
            <LogoLockup inverse />
          </Link>
        </div>

        <div className="relative mt-14 max-w-[455px]">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#d9b661] uppercase">
            Your trade, under control
          </p>
          <h2 className="mt-5 font-heading text-[42px] leading-[1.04] font-semibold tracking-[-0.04em] text-balance text-[#f5f8f4] xl:text-[48px]">
            Know your stock.
            <br />
            Own your numbers.
          </h2>
          <p className="mt-5 max-w-[400px] text-[15px] leading-[1.7] text-[#a9bdb2]">
            Madetom brings the counter, the store room and the day&apos;s takings into one clear
            working picture — built for Ghanaian shops, distributors and their teams.
          </p>

          <div className="mt-10 space-y-5 border-t border-[#24463a] pt-8">
            {promises.map((item) => (
              <div key={item.title} className="flex gap-3.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#2c4f41] bg-[#112b21] text-[#e5c26d]">
                  <item.icon className="size-4" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-[#edf3ee]">{item.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#8fa79b]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-14 flex items-end justify-between gap-6 border-t border-[#24463a] pt-6">
          <div>
            <p className="text-[12px] font-medium text-[#c6d5cb]">SamTech Labs</p>
            <p className="mt-1 text-[11px] tracking-[0.01em] text-[#7c9488]">
              Accra, Ghana · A product of SamTech Labs
            </p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#4d4425] bg-[#1b2c1e] font-heading text-[11px] font-semibold tracking-[0.08em] text-[#d9b661]">
            GH
          </span>
        </div>
      </aside>

      <main className="flex min-h-svh flex-col bg-[#f7f8f4]">
        <header className="flex items-center justify-between px-5 pt-5 sm:px-8 lg:px-10 lg:pt-8">
          <Link href="/" aria-label="Madetom home" className="rounded-md lg:hidden">
            <Logo />
          </Link>
          <div className="hidden lg:block" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to madetom.app
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-9 sm:px-8 lg:px-12">
          <div className="animate-rise w-full max-w-[430px]">{children}</div>
        </div>

        <footer className="px-5 pb-5 sm:px-8 lg:px-10 lg:pb-8">
          <p className="text-center text-[11.5px] text-muted-foreground">
            © SamTech Labs. Madetom is invitation-only.
          </p>
        </footer>
      </main>
    </div>
  );
}
