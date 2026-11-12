"use client";

import { useActionState } from "react";
import { createBranch } from "@/app/(business)/app/settings/actions";
import { initialActionState } from "@/lib/action-state";
import { FormError, Field, FormSection, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

type BranchCreateState = {
  error?: string;
  success?: string;
};

export function BranchCreateForm() {
  const [state, formAction] = useActionState(createBranch, initialActionState as BranchCreateState);

  return (
    <form action={formAction} className="space-y-4">
      <FormSection title="Add branch" description="Create a new trading location for this workspace.">
        <Field label="Branch name" htmlFor="branchName" required>
          <Input id="branchName" name="name" required className="h-9 text-[13px]" />
        </Field>
        <Field label="Branch code" htmlFor="branchCode" required>
          <Input id="branchCode" name="code" required placeholder="e.g. ACCRA1" className="h-9 text-[13px]" />
        </Field>
        <Field label="Address" htmlFor="branchAddress">
          <Input id="branchAddress" name="address" placeholder="e.g. 123 Independence Avenue" className="h-9 text-[13px]" />
        </Field>
        <Field label="Phone" htmlFor="branchPhone">
          <Input id="branchPhone" name="phone" inputMode="tel" placeholder="e.g. 024 123 4567" className="h-9 text-[13px]" />
        </Field>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Creating…">Add branch</SubmitButton>
      </div>
    </form>
  );
}
