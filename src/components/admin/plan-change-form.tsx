"use client";

import { useActionState } from "react";
import { changeOrganisationPlan } from "@/app/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { FormError, Field, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { NativeSelect } from "@/components/ui/native-select";
import { getAllPlans, formatPlanPrice } from "@/lib/subscription/plans";

type PlanChangeState = {
  error?: string;
  success?: string;
};

export function PlanChangeForm({
  tenantId,
  currentPlanKey,
}: {
  tenantId: string;
  currentPlanKey: string | null;
}) {
  const [state, formAction] = useActionState(changeOrganisationPlan, initialActionState as PlanChangeState);
  const plans = getAllPlans();

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      <Field label="Plan" htmlFor="planKey" required>
        <NativeSelect id="planKey" name="planKey" required defaultValue={currentPlanKey ?? "starter"}>
          {plans.map((p) => (
            <option key={p.key} value={p.key}>
              {p.name} — {formatPlanPrice(p.priceMonthly)} / month
            </option>
          ))}
        </NativeSelect>
      </Field>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Updating…">Change plan</SubmitButton>
      </div>
    </form>
  );
}
