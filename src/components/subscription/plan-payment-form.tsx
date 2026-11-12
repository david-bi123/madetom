"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import { startSubscriptionPayment } from "@/app/(business)/app/subscription/actions";
import { initialActionState } from "@/lib/action-state";
import { FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";

export function PlanPaymentForm({
  planKey,
  label,
  variant = "default",
  className,
}: {
  planKey: string;
  label: ReactNode;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  const [state, formAction] = useActionState(startSubscriptionPayment, initialActionState);

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="planKey" value={planKey} />
      <SubmitButton
        pendingLabel="Starting checkout…"
        variant={variant as "default" | "outline" | "secondary"}
        className="w-full"
      >
        {label}
      </SubmitButton>
      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}

export function UpgradeLinkFallback() {
  return (
    <Button variant="outline" disabled className="w-full">
      Payments unavailable
    </Button>
  );
}
