"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createExpense } from "@/app/(business)/app/expenses/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { todayInput } from "@/lib/dates";

export function ExpenseForm({ branchName }: { branchName: string }) {
  const [state, formAction] = useActionState(createExpense, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="Expense details"
        description={`This entry will be logged against ${branchName} and counted against gross profit.`}
      >
        <FormGrid>
          <Field label="Category" htmlFor="category" required>
            <NativeSelect id="category" name="category" defaultValue={EXPENSE_CATEGORIES[0]}>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Amount (GH₵)" htmlFor="amount" required>
            <Input
              id="amount"
              name="amount"
              inputMode="decimal"
              required
              placeholder="0.00"
              className="h-9 text-[13px]"
            />
          </Field>

          <Field label="Description" htmlFor="description" required className="sm:col-span-2">
            <Input
              id="description"
              name="description"
              required
              placeholder="October shop rent"
              className="h-9 text-[13px]"
            />
          </Field>

          <Field label="Date paid" htmlFor="expenseDate" required>
            <Input
              id="expenseDate"
              name="expenseDate"
              type="date"
              required
              defaultValue={todayInput()}
              className="h-9 text-[13px]"
            />
          </Field>

          <Field label="Paid by" htmlFor="paymentMethod" required>
            <NativeSelect id="paymentMethod" name="paymentMethod" defaultValue="cash">
              {PAYMENT_METHODS.filter((method) => method.value !== "credit").map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Reference"
            htmlFor="reference"
            hint="Receipt number, transfer reference or invoice number — optional."
            className="sm:col-span-2"
          >
            <Input id="reference" name="reference" maxLength={120} className="h-9 text-[13px]" />
          </Field>
        </FormGrid>
      </FormSection>

      <FormError message={state.error} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…">Save expense</SubmitButton>
        <Button variant="outline" render={<Link href="/app/expenses" />} nativeButton={false}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
