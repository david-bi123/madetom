"use client";

import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { archiveCustomer } from "@/app/(business)/app/customers/actions";

export function ArchiveCustomerButton({ customerId, name }: { customerId: string; name: string }) {
  return (
    <ConfirmActionButton
      action={archiveCustomer}
      fields={{ customerId }}
      triggerLabel="Archive"
      title={`Archive ${name}?`}
      description="The customer stays on past receipts and reports, but will no longer appear when adding a new sale."
      confirmLabel="Archive customer"
    />
  );
}
