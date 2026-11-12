"use client";

import { useActionState } from "react";
import { CreditCard } from "lucide-react";
import { retrySignupPayment } from "@/app/pending-payment/actions";
import { initialActionState } from "@/lib/action-state";
import { FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export function PendingPaymentForm({ planKey }: { planKey: string }) {
  const [state, formAction] = useActionState(retrySignupPayment, initialActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="planKey" value={planKey} />
      <SubmitButton pendingLabel="Starting checkout…" size="lg" className="w-full">
        <CreditCard className="size-4" aria-hidden />
        Complete payment
      </SubmitButton>
      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}
