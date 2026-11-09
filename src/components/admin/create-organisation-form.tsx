"use client";

import { useActionState } from "react";
import { createOrganisation } from "@/app/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, Field, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type CreateOrganisationFormProps = {
  plans: Array<{ key: string; name: string; smsCredits: number }>;
};

export function CreateOrganisationForm({ plans }: CreateOrganisationFormProps) {
  const [state, formAction] = useActionState(createOrganisation, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="New organisation"
        description="Creates the workspace and sends the owner a secure SMS link to finish setup."
      >
        <FormGrid>
          <Field label="Business name" htmlFor="businessName" required className="sm:col-span-2">
            <Input id="businessName" name="businessName" required className="h-9 text-[13px]" />
          </Field>
          <Field label="Business type" htmlFor="businessType" required>
            <Input id="businessType" name="businessType" required placeholder="Provision shop" className="h-9 text-[13px]" />
          </Field>
          <Field label="First branch name" htmlFor="branchName" required>
            <Input id="branchName" name="branchName" required placeholder="Main branch" className="h-9 text-[13px]" />
          </Field>
          <Field label="Owner name" htmlFor="ownerName" required>
            <Input id="ownerName" name="ownerName" required className="h-9 text-[13px]" />
          </Field>
          <Field label="Owner phone" htmlFor="ownerPhone" required>
            <Input id="ownerPhone" name="ownerPhone" inputMode="tel" required placeholder="024 123 4567" className="h-9 text-[13px]" />
          </Field>
          <Field label="Owner email" htmlFor="ownerEmail" required className="sm:col-span-2">
            <Input id="ownerEmail" name="ownerEmail" type="email" required className="h-9 text-[13px]" />
          </Field>
          <Field label="Plan" htmlFor="planKey" required className="sm:col-span-2">
            <NativeSelect id="planKey" name="planKey" defaultValue={plans[0]?.key ?? "trial"}>
              {plans.map((plan) => (
                <option key={plan.key} value={plan.key}>
                  {plan.name} · {plan.smsCredits} SMS credits
                </option>
              ))}
            </NativeSelect>
          </Field>
        </FormGrid>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Creating…">Create organisation</SubmitButton>
      </div>
    </form>
  );
}
