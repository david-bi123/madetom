"use client";

import { useActionState } from "react";
import { resendInvitation } from "@/app/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

type ResendState = {
  error?: string;
  success?: string;
};

/**
 * Sends a fresh setup link by SMS. The previous link stops working because
 * its token is replaced.
 */
export function ResendInvitationButton({ invitationId }: { invitationId: string }) {
  const [state, formAction] = useActionState(resendInvitation, initialActionState as ResendState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="invitationId" value={invitationId} />
      <SubmitButton pendingLabel="Sending…" variant="outline" size="sm">
        Resend link
      </SubmitButton>
      <FormError message={state.error} />
      {state.success ? (
        <p className="text-[11px] font-medium text-success">{state.success}</p>
      ) : null}
    </form>
  );
}
