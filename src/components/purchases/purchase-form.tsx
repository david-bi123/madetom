"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createPurchaseAction } from "@/app/(business)/app/purchases/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatMinor } from "@/lib/format";
import { Trash2 } from "lucide-react";

export type PurchaseProductOption = {
  id: string;
  name: string;
  sku: string;
  costPrice: string;
  unit: string;
};

export type PurchaseSupplierOption = {
  id: string;
  name: string;
};

type Line = { productId: string; quantity: string; unitCost: string };

export function PurchaseForm({
  products,
  suppliers,
}: {
  products: PurchaseProductOption[];
  suppliers: PurchaseSupplierOption[];
}) {
  const [state, formAction] = useActionState(createPurchaseAction, initialActionState);
  const [lines, setLines] = useState<Line[]>([
    { productId: products[0]?.id ?? "", quantity: "1", unitCost: products[0]?.costPrice ?? "0" },
  ]);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const totalMinor = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity) || 0;
    const cost = Number(line.unitCost) || 0;
    return sum + Math.round(quantity * cost * 100);
  }, 0);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    );
  }

  function handleProductChange(index: number, productId: string) {
    const product = productById.get(productId);
    updateLine(index, {
      productId,
      unitCost: product ? product.costPrice : "0",
    });
  }

  function addLine() {
    const next = products.find((product) => !lines.some((line) => line.productId === product.id));
    setLines((current) => [
      ...current,
      {
        productId: next?.id ?? products[0]?.id ?? "",
        quantity: "1",
        unitCost: next?.costPrice ?? "0",
      },
    ]);
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index),
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="Purchase details"
        description="Stock is added to this branch the moment you save. Every line is written to the stock ledger."
      >
        <FormGrid>
          <Field label="Supplier" htmlFor="supplierId" required>
            <NativeSelect id="supplierId" name="supplierId" defaultValue={suppliers[0]?.id ?? ""}>
              {suppliers.length === 0 ? <option value="">No suppliers yet</option> : null}
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Supplier reference" htmlFor="reference" hint="Invoice or delivery note number.">
            <Input id="reference" name="reference" maxLength={120} className="h-9 text-[13px]" />
          </Field>

          <Field label="Paid by" htmlFor="method" required>
            <NativeSelect id="method" name="method" defaultValue="cash">
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Amount paid (GH₵)"
            htmlFor="amountPaid"
            hint="Leave blank or 0 when the supplier is extending credit."
          >
            <Input
              id="amountPaid"
              name="amountPaid"
              inputMode="decimal"
              placeholder="0.00"
              className="h-9 text-[13px]"
            />
          </Field>
        </FormGrid>
      </FormSection>

      <section className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-heading text-[16px] font-semibold tracking-[-0.015em]">Items received</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Add what arrived, and what you paid for each item.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            Add line
          </Button>
        </div>

        <div className="divide-y divide-border/80">
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid items-end gap-3 px-5 py-4 sm:grid-cols-[1fr_96px_140px_40px]"
            >
              <Field label={index === 0 ? "Product" : ""} htmlFor={`line-product-${index}`}>
                <NativeSelect
                  id={`line-product-${index}`}
                  name="lineProductId"
                  value={line.productId}
                  onChange={(event) => handleProductChange(index, event.target.value)}
                >
                  {products.length === 0 ? <option value="">No products yet</option> : null}
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label={index === 0 ? "Qty" : ""} htmlFor={`line-quantity-${index}`}>
                <Input
                  id={`line-quantity-${index}`}
                  name="lineQuantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={line.quantity}
                  onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  className="h-9 text-[13px]"
                />
              </Field>

              <Field label={index === 0 ? "Unit cost (GH₵)" : ""} htmlFor={`line-cost-${index}`}>
                <Input
                  id={`line-cost-${index}`}
                  name="lineUnitCost"
                  inputMode="decimal"
                  required
                  value={line.unitCost}
                  onChange={(event) => updateLine(index, { unitCost: event.target.value })}
                  className="h-9 text-[13px]"
                />
              </Field>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeLine(index)}
                disabled={lines.length === 1}
                aria-label={`Remove line ${index + 1}`}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3.5">
          <span className="text-[12.5px] font-medium text-muted-foreground">Purchase total</span>
          <span className="font-mono text-[14px] font-semibold tabular">{formatMinor(totalMinor)}</span>
        </div>
      </section>

      <FormSection title="Notes" description="Anything worth remembering about this delivery.">
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={1000}
          placeholder="Delivery condition, discounts agreed, anything to remember."
          className="text-[13px]"
        />
      </FormSection>

      <FormError message={state.error} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Receiving…">Receive purchase</SubmitButton>
        <Button variant="outline" render={<Link href="/app/purchases" />} nativeButton={false}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
