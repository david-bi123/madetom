"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createSupplier } from "@/app/(business)/app/suppliers/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SupplierForm() {
  const [state, formAction] = useActionState(createSupplier, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="Supplier details"
        description="Suppliers are the traders and distributors you buy stock from."
      >
        <FormGrid>
          <Field label="Supplier name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              required
              placeholder="Nkrumah Wholesale"
              className="h-9 text-[13px]"
            />
          </Field>

          <Field label="Contact person" htmlFor="contactName">
            <Input id="contactName" name="contactName" maxLength={120} className="h-9 text-[13px]" />
          </Field>

          <Field label="Phone" htmlFor="phone">
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

          <Field label="Address" htmlFor="address" className="sm:col-span-2">
            <Input id="address" name="address" maxLength={255} className="h-9 text-[13px]" />
          </Field>

          <Field
            label="Notes"
            htmlFor="notes"
            hint="What they usually supply, delivery days, credit terms."
            className="sm:col-span-2"
          >
            <Textarea id="notes" name="notes" rows={3} maxLength={1000} className="text-[13px]" />
          </Field>
        </FormGrid>
      </FormSection>

      <FormError message={state.error} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…">Add supplier</SubmitButton>
        <Button variant="outline" render={<Link href="/app/suppliers" />} nativeButton={false}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
