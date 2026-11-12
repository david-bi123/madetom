import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlanConfig, type PlanKey } from "@/lib/subscription/plans";

/**
 * Shown when a page is available on the current plan but the feature is not.
 * The server action behind the page enforces the same entitlement, so this is
 * only the user-facing explanation.
 */
export function FeatureGate({
  title,
  description,
  requiredPlan,
}: {
  title: string;
  description: string;
  requiredPlan: PlanKey | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Lock className="size-5" aria-hidden />
      </span>
      <h2 className="mt-4 font-heading text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {requiredPlan ? (
        <p className="mt-3 text-[12.5px] font-medium text-foreground">
          Available on the {getPlanConfig(requiredPlan).name} plan and above.
        </p>
      ) : null}
      <div className="mt-5">
        <Button render={<Link href="/app/subscription" />} nativeButton={false}>
          View plans &amp; upgrade
        </Button>
      </div>
    </div>
  );
}
