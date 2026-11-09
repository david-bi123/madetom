"use client";

import { useActionState } from "react";
import {
  archiveVariant,
  createVariant,
  updateVariant,
} from "@/app/(business)/app/products/actions";
import { initialActionState } from "@/lib/action-state";
import { FormError, FormGrid, FormSection, FormSuccess, Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusBadge } from "@/components/ui/status-badge";

export type VariantRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  costPrice: string;
  sellingPrice: string;
  reorderLevel: number;
  status: "active" | "archived";
  quantity: number;
};

type VariantsManagerProps = {
  productId: string;
  variants: VariantRow[];
};

export function VariantsManager({ productId, variants }: VariantsManagerProps) {
  return (
    <div className="mt-5">
      <FormSection
        title="Variants"
        description="Sell sizes, flavours, or bundles as separate stock lines. The till uses each variant's own price and stock."
      >
        {variants.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[12.5px] text-muted-foreground">
            No variants yet. Add one below and it will appear at the till.
          </p>
        ) : (
          <div className="space-y-2.5">
            {variants.map((variant) => (
              <VariantEditor key={variant.id} variant={variant} />
            ))}
          </div>
        )}

        <div className="mt-5 border-t border-border/70 pt-5">
          <h3 className="font-heading text-[14px] font-semibold">Add a variant</h3>
          <div className="mt-3">
            <NewVariantForm productId={productId} />
          </div>
        </div>
      </FormSection>
    </div>
  );
}

function VariantEditor({ variant }: { variant: VariantRow }) {
  const [state, formAction] = useActionState(updateVariant, initialActionState);

  return (
    <details className="rounded-lg border border-border bg-background">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-3 text-[12.5px]">
        <span className="font-semibold text-foreground">{variant.name}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{variant.sku}</span>
        <StatusBadge status={variant.status} />
        <span className="ml-auto font-mono text-[11.5px] text-muted-foreground tabular">
          {variant.quantity} in stock
        </span>
      </summary>
      <form action={formAction} className="space-y-3 border-t border-border/70 px-3.5 py-3.5">
        <input type="hidden" name="id" value={variant.id} />
        <VariantFields variant={variant} />
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
        <SubmitButton pendingLabel="Saving…">Save variant</SubmitButton>
      </form>
      {variant.status === "active" ? (
        <div className="border-t border-border/70 px-3.5 py-3">
          <ConfirmActionButton
            action={archiveVariant}
            fields={{ id: variant.id }}
            triggerLabel="Archive variant"
            title="Archive this variant?"
            description={`${variant.name} will stop appearing at the till. Its sales history and stock ledger are kept.`}
            confirmLabel="Archive variant"
            variant="destructive-soft"
          />
        </div>
      ) : null}
    </details>
  );
}

function NewVariantForm({ productId }: { productId: string }) {
  const [state, formAction] = useActionState(createVariant, initialActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <VariantFields />
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <SubmitButton pendingLabel="Adding…">Add variant</SubmitButton>
    </form>
  );
}

function VariantFields({ variant }: { variant?: VariantRow }) {
  return (
    <FormGrid className="sm:grid-cols-2">
      <Field label="Variant name" htmlFor={variant ? `variant-name-${variant.id}` : "variant-name"} required>
        <Input
          id={variant ? `variant-name-${variant.id}` : "variant-name"}
          name="name"
          required
          defaultValue={variant?.name ?? ""}
          placeholder="e.g. 500 ml"
          className="h-9 text-[13px]"
        />
      </Field>
      <Field label="SKU" htmlFor={variant ? `variant-sku-${variant.id}` : "variant-sku"} required>
        <Input
          id={variant ? `variant-sku-${variant.id}` : "variant-sku"}
          name="sku"
          required
          defaultValue={variant?.sku ?? ""}
          placeholder="e.g. COKE-500"
          className="h-9 font-mono text-[13px]"
        />
      </Field>
      <Field label="Barcode" htmlFor={variant ? `variant-barcode-${variant.id}` : "variant-barcode"}>
        <Input
          id={variant ? `variant-barcode-${variant.id}` : "variant-barcode"}
          name="barcode"
          defaultValue={variant?.barcode ?? ""}
          className="h-9 font-mono text-[13px]"
        />
      </Field>
      <Field label="Status" htmlFor={variant ? `variant-status-${variant.id}` : "variant-status"}>
        <NativeSelect
          id={variant ? `variant-status-${variant.id}` : "variant-status"}
          name="status"
          defaultValue={variant?.status ?? "active"}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </NativeSelect>
      </Field>
      <Field label="Cost price" htmlFor={variant ? `variant-cost-${variant.id}` : "variant-cost"} required>
        <Input
          id={variant ? `variant-cost-${variant.id}` : "variant-cost"}
          name="costPrice"
          inputMode="decimal"
          required
          defaultValue={variant?.costPrice ?? "0"}
          className="h-9 text-[13px]"
        />
      </Field>
      <Field label="Selling price" htmlFor={variant ? `variant-price-${variant.id}` : "variant-price"} required>
        <Input
          id={variant ? `variant-price-${variant.id}` : "variant-price"}
          name="sellingPrice"
          inputMode="decimal"
          required
          defaultValue={variant?.sellingPrice ?? "0"}
          className="h-9 text-[13px]"
        />
      </Field>
      <Field label="Reorder level" htmlFor={variant ? `variant-reorder-${variant.id}` : "variant-reorder"}>
        <Input
          id={variant ? `variant-reorder-${variant.id}` : "variant-reorder"}
          name="reorderLevel"
          type="number"
          min={0}
          max={999}
          defaultValue={String(variant?.reorderLevel ?? 5)}
          className="h-9 text-[13px]"
        />
      </Field>
    </FormGrid>
  );
}
