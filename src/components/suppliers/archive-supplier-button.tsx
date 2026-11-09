"use client";

import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { archiveSupplier } from "@/app/(business)/app/suppliers/actions";

export function ArchiveSupplierButton({ supplierId, name }: { supplierId: string; name: string }) {
  return (
    <ConfirmActionButton
      action={archiveSupplier}
      fields={{ supplierId }}
      triggerLabel="Archive"
      title={`Archive ${name}?`}
      description="Past purchases stay linked to this supplier, but it will no longer appear when recording a new purchase."
      confirmLabel="Archive supplier"
    />
  );
}
