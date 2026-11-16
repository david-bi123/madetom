import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown inside the platform console when a page or organisation is missing. */
export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-5" aria-hidden />
      </span>
      <h1 className="mt-4 font-heading text-[22px] font-semibold tracking-[-0.015em]">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        The link may be out of date, or the record has been removed.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button render={<Link href="/admin" />} nativeButton={false}>
          Back to overview
        </Button>
        <Button
          variant="outline"
          render={<Link href="/admin/organisations" />}
          nativeButton={false}
        >
          All organisations
        </Button>
      </div>
    </div>
  );
}
