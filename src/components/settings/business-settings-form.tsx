"use client";

import { useActionState } from "react";
import { updateBusinessSettings } from "@/app/(business)/app/settings/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, Field, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type BusinessSettingsFormProps = {
  values: {
    name: string;
    businessType: string;
    region: string | null;
    location: string | null;
    phone: string | null;
    email: string | null;
    taxRate: string;
    pricesIncludeTax: boolean;
    allowPartialPayments: boolean;
  };
};

const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Volta",
  "Northern",
  "Bono",
  "Ahafo",
  "Upper East",
  "Upper West",
  "Oti",
  "Savannah",
  "North East",
  "Western North",
];

export function BusinessSettingsForm({ values }: BusinessSettingsFormProps) {
  const [state, formAction] = useActionState(updateBusinessSettings, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <FormSection title="Business details" description="How your shop appears on receipts and reports.">
        <FormGrid>
          <Field label="Business name" htmlFor="name" required className="sm:col-span-2">
            <Input id="name" name="name" required defaultValue={values.name} className="h-9 text-[13px]" />
          </Field>
          <Field label="Business type" htmlFor="businessType" required>
            <Input id="businessType" name="businessType" required defaultValue={values.businessType} className="h-9 text-[13px]" />
          </Field>
          <Field label="Region" htmlFor="region">
            <NativeSelect id="region" name="region" defaultValue={values.region ?? ""}>
              <option value="">Not set</option>
              {GHANA_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Location" htmlFor="location" className="sm:col-span-2">
            <Input id="location" name="location" defaultValue={values.location ?? ""} className="h-9 text-[13px]" />
          </Field>
          <Field label="Phone" htmlFor="phone" required>
            <Input id="phone" name="phone" required defaultValue={values.phone ?? ""} className="h-9 text-[13px]" />
          </Field>
          <Field label="Email" htmlFor="email" required>
            <Input id="email" name="email" type="email" required defaultValue={values.email ?? ""} className="h-9 text-[13px]" />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Trading rules" description="Tax and payment behaviour applied at the till.">
        <FormGrid>
          <Field label="Tax rate %" htmlFor="taxRate" required>
            <Input id="taxRate" name="taxRate" inputMode="decimal" required defaultValue={values.taxRate} className="h-9 text-[13px]" />
          </Field>
          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3.5 text-[13px]">
              <input type="checkbox" name="pricesIncludeTax" value="true" defaultChecked={values.pricesIncludeTax} className="mt-0.5 size-4 accent-primary" />
              <span>
                <span className="block font-semibold">Prices include tax</span>
                <span className="mt-0.5 block text-muted-foreground">Selling prices already contain the tax amount.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3.5 text-[13px]">
              <input type="checkbox" name="allowPartialPayments" value="true" defaultChecked={values.allowPartialPayments} className="mt-0.5 size-4 accent-primary" />
              <span>
                <span className="block font-semibold">Allow partial payments</span>
                <span className="mt-0.5 block text-muted-foreground">Cashiers can record a part payment and the balance.</span>
              </span>
            </label>
          </div>
        </FormGrid>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
      </div>
    </form>
  );
}
