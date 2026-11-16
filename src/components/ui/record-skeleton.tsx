import { cn } from "@/lib/utils";

/**
 * Placeholder shown while a record page streams in. Keeping a loading boundary
 * on record routes means the shell paints immediately, including when the
 * record turns out to be missing and the 404 boundary takes over.
 */
export function RecordSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-4xl animate-pulse", className)} aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-3 h-7 w-56 rounded bg-muted" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-muted" />
      <div className="mt-6 space-y-4">
        <div className="h-32 rounded-xl border border-border bg-card" />
        <div className="h-44 rounded-xl border border-border bg-card" />
        <div className="h-24 rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}
