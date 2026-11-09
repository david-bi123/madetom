"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createCategory, updateCategory } from "@/app/(business)/app/categories/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, FormSuccess, Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CategoryFormProps = {
  mode: "create" | "update";
  category?: { id: string; name: string; description: string | null };
};

export function CategoryForm({ mode, category }: CategoryFormProps) {
  const [state, formAction] = useActionState(
    mode === "create" ? createCategory : updateCategory,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {mode === "update" ? <input type="hidden" name="id" value={category?.id} /> : null}

      <FormSection
        title="Category details"
        description="Categories group products in the catalogue, the till, and reports."
      >
        <FormGrid>
          <Field label="Category name" htmlFor="name" required className="sm:col-span-2">
            <Input id="name" name="name" required defaultValue={category?.name ?? ""} className="h-9 text-[13px]" />
          </Field>
          <Field label="Description" htmlFor="description" className="sm:col-span-2">
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={255}
              defaultValue={category?.description ?? ""}
              className="flex min-h-16 w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground shadow-[0_1px_1px_rgb(16_35_27/2%)] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/12 md:text-sm"
            />
          </Field>
        </FormGrid>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…">
          {mode === "create" ? "Create category" : "Save category"}
        </SubmitButton>
        <Button variant="outline" render={<Link href="/app/categories" />} nativeButton={false}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
