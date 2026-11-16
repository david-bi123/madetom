import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown inside the workspace shell when a record or URL does not exist, so a
 * dead link still has the sidebar and a way back.
 */
export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-5" aria-hidden />
      </span>
      <h1 className="mt-4 font-heading text-[22px] font-semibold tracking-[-0.015em]">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        The link may be out of date, or the record belongs to another workspace.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button render={<Link href="/app" />} nativeButton={false}>
          Back to dashboard
        </Button>
        <Button
          variant="outline"
          render={<Link href="/app/products" />}
          nativeButton={false}
        >
          Browse products
        </Button>
      </div>
    </div>
  );
}
