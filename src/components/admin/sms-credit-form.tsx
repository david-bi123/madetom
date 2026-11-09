"use client";

import { useActionState } from "react";
import { creditSmsWallet } from "@/app/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, Field, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type SmsCreditFormProps = {
  wallets: Array<{ tenantId: string; tenantName: string; credits: number }>;
};

export function SmsCreditForm({ wallets }: SmsCreditFormProps) {
  const [state, formAction] = useActionState(creditSmsWallet, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="Adjust SMS wallet"
        description="Add or remove credits from a business wallet. Every change is written to the audit log."
      >
        <FormGrid>
          <Field label="Organisation" htmlFor="tenantId" required className="sm:col-span-2">
            <NativeSelect id="tenantId" name="tenantId" defaultValue={wallets[0]?.tenantId ?? ""}>
              {wallets.length === 0 ? <option value="">No wallets yet</option> : null}
              {wallets.map((wallet) => (
                <option key={wallet.tenantId} value={wallet.tenantId}>
                  {wallet.tenantName} · {wallet.credits} credits
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Credits"
            htmlFor="credits"
            required
            hint="Use a negative number to remove credits."
          >
            <Input id="credits" name="credits" type="number" step="1" required placeholder="100" className="h-9 text-[13px]" />
          </Field>
          <Field label="Reason" htmlFor="description" required>
            <Input
              id="description"
              name="description"
              required
              placeholder="Monthly top-up"
              className="h-9 text-[13px]"
            />
          </Field>
        </FormGrid>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Applying…">Apply adjustment</SubmitButton>
      </div>
    </form>
  );
}
