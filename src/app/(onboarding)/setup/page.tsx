import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp, Link2Off, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Open your setup link",
  description: "Madetom workspace setup links are single-use and sent by SMS.",
  robots: { index: false, follow: false },
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@madetom.app";

/**
 * Fallback for `/setup` with no token — for example when a long SMS link was
 * cut short by the phone's messaging app. Without this page the route would
 * return a bare 404 with no explanation.
 */
export default function SetupLandingPage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <span className="flex size-11 items-center justify-center rounded-xl border border-[#edd9b0] bg-[#fbf4e4] text-[#8a6416]">
          <Link2Off className="size-5" aria-hidden />
        </span>
        <h1 className="mt-5 font-heading text-[26px] font-semibold tracking-[-0.03em]">
          Open the full link from your SMS
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          This address is missing the secure token that identifies your invitation. Setup links are
          long, so some phones cut them short. Open the message again and tap the link, or copy the
          whole address including everything after <code className="text-[12px]">/setup/</code>.
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
          If the message is gone, ask your Madetom administrator to resend it — a new link takes a
          few seconds.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button render={<Link href="/login" />} className="h-10" nativeButton={false}>
            <LogIn className="size-4" aria-hidden />
            Go to sign in
            <ArrowRight className="size-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            className="h-10"
            render={<a href={`mailto:${SUPPORT_EMAIL}?subject=Madetom setup link help`} />}
          >
            <CircleHelp className="size-4" aria-hidden />
            Ask for a new link
          </Button>
        </div>
      </div>
    </div>
  );
}
