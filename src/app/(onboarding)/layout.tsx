import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@madetom.app";
const SUPPORT_LINK = `mailto:${SUPPORT_EMAIL}?subject=Madetom workspace setup`;

/** Setup pages read the invitation token and session at request time. */
export const instant = false;

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-[#f5f7f2]">
      <div aria-hidden className="h-1 bg-[linear-gradient(90deg,#0f5c47_0%,#0f5c47_62%,#c8962d_62%,#c8962d_100%)]" />
      <header className="border-b border-border/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Madetom home" className="rounded-md">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 rounded-full border border-[#cfe0d5] bg-[#f0f6f1] px-2.5 py-1 text-[11px] font-medium text-[#1a5d44] sm:inline-flex">
              <LockKeyhole className="size-3" aria-hidden />
              Secure workspace setup
            </span>
            <a
              href={SUPPORT_LINK}
              className="rounded text-[12.5px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Need help?
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-11">{children}</main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <div className="flex flex-col gap-2 border-t border-border/80 pt-5 text-[11.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Madetom is invitation-only. Setup links are single-use and expire for your security.</p>
          <p>© SamTech Labs · Accra, Ghana</p>
        </div>
      </footer>
    </div>
  );
}
