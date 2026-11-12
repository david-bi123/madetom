"use client";

import { useActionState } from "react";
import { setPaymentExemption } from "@/app/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { FormError, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

type ExemptionState = {
  error?: string;
  success?: string;
};

/**
 * Includes or excludes an organisation from online Paystack payment.
 */
export function PaymentExemptionForm({
  tenantId,
  exempt,
}: {
  tenantId: string;
  exempt: boolean;
}) {
  const [state, formAction] = useActionState(
    setPaymentExemption,
    initialActionState as ExemptionState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="exempt" value={exempt ? "false" : "true"} />
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={exempt}
          readOnly
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span>
          <span className="block text-[12.5px] font-semibold text-foreground">
            Excluded from online payment
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
            {exempt
              ? "This workspace is billed manually. It keeps its plan but cannot pay online."
              : "This workspace can pay for plans and renewals through Paystack."}
          </span>
        </span>
      </label>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <SubmitButton pendingLabel="Saving…" variant="outline" size="sm">
        {exempt ? "Allow online payment" : "Exclude from online payment"}
      </SubmitButton>
    </form>
  );
}
