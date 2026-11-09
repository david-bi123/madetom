"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { adjustStockAction, transferStockAction } from "@/app/(business)/app/inventory/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export type StockProductOption = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
};

export type StockVariantOption = {
  id: string;
  productId: string;
  productName: string;
  name: string;
  sku: string;
  quantity: number;
};

export type StockBranchOption = {
  id: string;
  name: string;
};

const ADJUSTMENT_REASONS = [
  "Stock count correction",
  "Damaged goods",
  "Expired goods",
  "Shrinkage",
  "Opening stock",
  "Supplier short delivery",
  "Other",
] as const;

export function StockAdjustmentForm({
  products,
  variants,
}: {
  products: StockProductOption[];
  variants: StockVariantOption[];
}) {
  const [state, formAction] = useActionState(adjustStockAction, initialActionState);
  const [type, setType] = useState<"increase" | "decrease" | "set">("increase");

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="Adjustment details"
        description="Record a correction, damage, or a physical stock count for this branch. Every adjustment is written to the stock ledger."
      >
        <FormGrid>
          <Field label="Product" htmlFor="productId" required className="sm:col-span-2">
            <NativeSelect id="productId" name="productId" defaultValue={products[0]?.id ?? ""}>
              {products.length === 0 ? <option value="">No tracked products</option> : null}
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku}) — {product.quantity} {product.unit} on hand
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Variant (optional)"
            htmlFor="variantId"
            className="sm:col-span-2"
            hint="Choose a variant when this product is sold in separate sizes, flavours, or bundles."
          >
            <NativeSelect id="variantId" name="variantId" defaultValue="">
              <option value="">Base product — no variant</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.productName} — {variant.name} ({variant.sku}) · {variant.quantity} on hand
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Adjustment" htmlFor="type" required>
            <NativeSelect
              id="type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as typeof type)}
            >
              <option value="increase">Add units</option>
              <option value="decrease">Remove units</option>
              <option value="set">Set to a counted quantity</option>
            </NativeSelect>
          </Field>

          <Field
            label={type === "set" ? "Counted quantity" : "Units"}
            htmlFor="quantity"
            required
            hint={type === "decrease" ? "You cannot remove more than is on hand." : undefined}
          >
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={type === "set" ? products[0]?.quantity ?? 0 : 1}
              className="h-9 text-[13px]"
            />
          </Field>

          <Field label="Reason" htmlFor="reason" required>
            <NativeSelect id="reason" name="reason" defaultValue={ADJUSTMENT_REASONS[0]}>
              {ADJUSTMENT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Notes"
            htmlFor="notes"
            hint="Anything the next person should know — optional."
          >
            <Textarea id="notes" name="notes" rows={3} maxLength={255} className="text-[13px]" />
          </Field>
        </FormGrid>
      </FormSection>

      <FormError message={state.error} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…">Save adjustment</SubmitButton>
        <Button variant="outline" render={<Link href="/app/inventory" />} nativeButton={false}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function StockTransferForm({
  products,
  branches,
  variants,
}: {
  products: StockProductOption[];
  branches: StockBranchOption[];
  variants: StockVariantOption[];
}) {
  const [state, formAction] = useActionState(transferStockAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="Transfer details"
        description="Move units from the active branch to another branch in this workspace. Both balances are updated together."
      >
        <FormGrid>
          <Field label="Product" htmlFor="productId" required className="sm:col-span-2">
            <NativeSelect id="productId" name="productId" defaultValue={products[0]?.id ?? ""}>
              {products.length === 0 ? <option value="">No tracked products</option> : null}
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku}) — {product.quantity} {product.unit} on hand
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Variant (optional)"
            htmlFor="variantId"
            className="sm:col-span-2"
            hint="Choose a variant when this product is sold in separate sizes, flavours, or bundles."
          >
            <NativeSelect id="variantId" name="variantId" defaultValue="">
              <option value="">Base product — no variant</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.productName} — {variant.name} ({variant.sku}) · {variant.quantity} on hand
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Receiving branch" htmlFor="toBranchId" required>
            <NativeSelect id="toBranchId" name="toBranchId" defaultValue={branches[0]?.id ?? ""}>
              {branches.length === 0 ? <option value="">No other branch available</option> : null}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Units to move" htmlFor="quantity" required>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              step="1"
              required
              defaultValue={1}
              className="h-9 text-[13px]"
            />
          </Field>

          <Field
            label="Notes"
            htmlFor="notes"
            hint="Why is this stock moving? Optional."
            className="sm:col-span-2"
          >
            <Textarea id="notes" name="notes" rows={3} maxLength={255} className="text-[13px]" />
          </Field>
        </FormGrid>
      </FormSection>

      <FormError message={state.error} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Transferring…">Record transfer</SubmitButton>
        <Button variant="outline" render={<Link href="/app/inventory" />} nativeButton={false}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
