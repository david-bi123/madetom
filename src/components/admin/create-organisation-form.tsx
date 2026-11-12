"use client";

import { useActionState } from "react";
import { createOrganisation } from "@/app/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { FormSection, FormError, Field, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { getAllPlans, formatPlanPrice, type PlanConfig } from "@/lib/subscription/plans";

export function CreateOrganisationForm() {
  const [state, formAction] = useActionState(createOrganisation, initialActionState);
  const plans = getAllPlans();

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="New organisation"
        description="Creates the workspace and sends the owner a secure SMS link to finish setup."
      >
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
        <Field label="Subscription plan" htmlFor="planKey" required className="sm:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map((plan: PlanConfig) => (
              <label key={plan.key} className="flex cursor-pointer items-center justify-between rounded-xl border border-transparent p-3 transition-colors hover:border-primary/50">
                <input
                  type="radio"
                  name="planKey"
                  value={plan.key}
                  defaultChecked={plan.key === "starter"}
                  required
                  className="size-4 accent-primary shrink-0"
                />
                <div>
                  <p className="text-[12.5px] font-semibold text-foreground">{plan.name}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-primary">{formatPlanPrice(plan.priceMonthly)} / month</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground leading-relaxed">
                    {plan.maxProducts === null ? "Unlimited products" : `${plan.maxProducts.toLocaleString()} products`}
                    {", "} {plan.maxStaff} staff{", "} {plan.maxBranches} branch{plan.maxBranches === 1 ? "" : "s"}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            The plan sets product, staff and branch limits. It can be changed later by the platform administrator.
          </p>
        </Field>
        <Field label="Billing" htmlFor="paymentExempt" className="sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3">
            <input
              type="checkbox"
              id="paymentExempt"
              name="paymentExempt"
              value="true"
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>
              <span className="block text-[12.5px] font-semibold text-foreground">
                Exclude from online payment
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                Use this for test, partner or complimentary organisations. They keep the plan but
                cannot pay online — the platform team bills them manually.
              </span>
            </span>
          </label>
        </Field>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Creating…">Create organisation</SubmitButton>
      </div>
    </form>
  );
}
