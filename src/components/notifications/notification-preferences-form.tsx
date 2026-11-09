"use client";

import { useActionState } from "react";
import { updateNotificationPreferences } from "@/app/(business)/app/notifications/actions";
import { initialActionState } from "@/lib/action-state";
import { FormError, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export type NotificationPreferences = {
  lowStock: boolean;
  outOfStock: boolean;
  dailySummary: boolean;
  stockAdjustments: boolean;
  smsLowStock: boolean;
  smsOutOfStock: boolean;
  smsDailySummary: boolean;
  smsStockAdjustment: boolean;
};

const IN_APP_OPTIONS = [
  {
    name: "lowStock",
    label: "Low stock alerts",
    hint: "Tell me when a product falls to its reorder level.",
  },
  {
    name: "outOfStock",
    label: "Out of stock alerts",
    hint: "Tell me the moment a product runs out at my branch.",
  },
  {
    name: "dailySummary",
    label: "Daily trading summary",
    hint: "Yesterday's sales, net revenue and gross profit in the notification feed.",
  },
  {
    name: "stockAdjustments",
    label: "Stock adjustment records",
    hint: "A note whenever stock is corrected, damaged or counted.",
  },
] as const;

const SMS_OPTIONS = [
  {
    name: "smsLowStock",
    label: "Low stock by SMS",
    hint: "Uses one SMS credit per alert.",
  },
  {
    name: "smsOutOfStock",
    label: "Out of stock by SMS",
    hint: "Uses one SMS credit per alert.",
  },
  {
    name: "smsDailySummary",
    label: "Daily summary by SMS",
    hint: "Uses one SMS credit each evening.",
  },
  {
    name: "smsStockAdjustment",
    label: "Stock adjustments by SMS",
    hint: "Uses one SMS credit when stock is corrected, damaged or counted.",
  },
] as const;

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3.5">
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 accent-primary"
      />
      <span>
        <span className="block text-[13px] font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted-foreground">
          {hint}
        </span>
      </span>
    </label>
  );
}

export function NotificationPreferencesForm({
  values,
  smsCredits,
}: {
  values: NotificationPreferences;
  smsCredits: number;
}) {
  const [state, formAction] = useActionState(updateNotificationPreferences, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 border-b border-border/70 pb-3">
          <h2 className="font-heading text-[15px] font-semibold">In the app</h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            These appear in the notifications feed for your account.
          </p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {IN_APP_OPTIONS.map((option) => (
            <Toggle
              key={option.name}
              name={option.name}
              label={option.label}
              hint={option.hint}
              defaultChecked={values[option.name]}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 border-b border-border/70 pb-3">
          <h2 className="font-heading text-[15px] font-semibold">By SMS</h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Sent to your phone number. You have {smsCredits} SMS credit
            {smsCredits === 1 ? "" : "s"} left.
          </p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {SMS_OPTIONS.map((option) => (
            <Toggle
              key={option.name}
              name={option.name}
              label={option.label}
              hint={option.hint}
              defaultChecked={values[option.name]}
            />
          ))}
        </div>
      </section>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <SubmitButton pendingLabel="Saving…">Save preferences</SubmitButton>
    </form>
  );
}
