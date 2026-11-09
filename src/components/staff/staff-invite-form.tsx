"use client";

import { useActionState } from "react";
import { inviteStaff } from "@/app/(business)/app/staff/invite/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, Field, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type StaffInviteFormProps = {
  branches: Array<{ id: string; name: string }>;
  defaultBranchId: string;
};

const ROLE_OPTIONS = [
  { key: "manager", label: "Manager", hint: "Runs day-to-day selling, stock and purchasing." },
  { key: "cashier", label: "Cashier", hint: "Sells at the till. No financial reports or purchasing." },
  {
    key: "inventory_manager",
    label: "Inventory Manager",
    hint: "Owns products, stock, suppliers and purchase receiving.",
  },
] as const;

export function StaffInviteForm({ branches, defaultBranchId }: StaffInviteFormProps) {
  const [state, formAction] = useActionState(inviteStaff, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="Who are you inviting?"
        description="They will receive an SMS with a secure, single-use link to set up their account."
      >
        <FormGrid>
          <Field label="Full name" htmlFor="name" required>
            <Input id="name" name="name" required className="h-9 text-[13px]" />
          </Field>
          <Field label="Phone number" htmlFor="phone" required hint="The invitation link goes here by SMS.">
            <Input id="phone" name="phone" inputMode="tel" required placeholder="024 123 4567" className="h-9 text-[13px]" />
          </Field>
          <Field label="Email" htmlFor="email" className="sm:col-span-2">
            <Input id="email" name="email" type="email" className="h-9 text-[13px]" />
          </Field>
          <Field label="Role" htmlFor="roleKey" required className="sm:col-span-2">
            <NativeSelect id="roleKey" name="roleKey" defaultValue="cashier">
              {ROLE_OPTIONS.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.label} — {role.hint}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Branch" htmlFor="branchId" required className="sm:col-span-2">
            <NativeSelect id="branchId" name="branchId" defaultValue={defaultBranchId}>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </FormGrid>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Sending…">Send invitation</SubmitButton>
        <Button variant="outline" render={<a href="/app/staff" />} nativeButton={false}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
