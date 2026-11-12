"use client";

import { useActionState } from "react";
import { setSubscriptionStatus } from "@/app/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { Field, FormError, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "suspended", label: "Suspended" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export function SubscriptionStatusForm({
  tenantId,
  currentStatus,
}: {
  tenantId: string;
  currentStatus: string | null;
}) {
  const [state, formAction] = useActionState(setSubscriptionStatus, initialActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      <Field label="Subscription status" htmlFor="subscription-status" required>
        <NativeSelect
          id="subscription-status"
          name="status"
          required
          defaultValue={currentStatus && currentStatus !== "trial" ? currentStatus : "active"}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field
        label="Reason"
        htmlFor="subscription-status-reason"
        hint="Recorded in the subscription history and audit log."
      >
        <Input id="subscription-status-reason" name="reason" placeholder="Optional note" maxLength={255} />
      </Field>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <SubmitButton pendingLabel="Updating…" variant="outline" size="sm">
        Update status
      </SubmitButton>
    </form>
  );
}
