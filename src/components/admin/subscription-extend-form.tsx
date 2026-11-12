"use client";

import { useActionState } from "react";
import { extendSubscription } from "@/app/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { Field, FormError, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

export function SubscriptionExtendForm({ tenantId }: { tenantId: string }) {
  const [state, formAction] = useActionState(extendSubscription, initialActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      <Field
        label="Extend by (days)"
        htmlFor="subscription-extend-days"
        hint="Extends from the current renewal date, or from today if it has passed."
        required
      >
        <Input
          id="subscription-extend-days"
          name="days"
          type="number"
          min={1}
          max={366}
          defaultValue={30}
          required
        />
      </Field>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <SubmitButton pendingLabel="Extending…" variant="outline" size="sm">
        Extend subscription
      </SubmitButton>
    </form>
  );
}
