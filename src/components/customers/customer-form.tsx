"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createCustomer } from "@/app/(business)/app/customers/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CustomerForm() {
  const [state, formAction] = useActionState(createCustomer, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="Customer details"
        description="Linking a sale to a customer gives you their lifetime value at each branch."
      >
        <FormGrid>
          <Field label="Full name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              required
              placeholder="Ama Boateng"
              className="h-9 text-[13px]"
            />
          </Field>

          <Field label="Phone" htmlFor="phone" hint="Optional but useful for credit sales.">
            <Input
              id="phone"
              name="phone"
              inputMode="tel"
              placeholder="024 123 4567"
              className="h-9 text-[13px]"
            />
          </Field>

          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" className="h-9 text-[13px]" />
          </Field>

          <Field label="Address" htmlFor="address">
            <Input id="address" name="address" maxLength={255} className="h-9 text-[13px]" />
          </Field>

          <Field
            label="Notes"
            htmlFor="notes"
            hint="Credit terms, preferred delivery day, anything worth remembering."
            className="sm:col-span-2"
          >
            <Textarea id="notes" name="notes" rows={3} maxLength={1000} className="text-[13px]" />
          </Field>
        </FormGrid>
      </FormSection>

      <FormError message={state.error} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…">Add customer</SubmitButton>
        <Button variant="outline" render={<Link href="/app/customers" />} nativeButton={false}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
