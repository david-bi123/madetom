"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { importProducts } from "@/app/(business)/app/products/import/actions";
import { initialActionState } from "@/lib/action-state";
import { FormSection, FormError, FormSuccess, Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";

export function ProductImportForm() {
  const [state, formAction] = useActionState(importProducts, initialActionState);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string>();

  return (
    <form action={formAction} className="space-y-5">
      <FormSection
        title="Import products"
        description="Paste CSV content or choose a file. Products are matched by SKU: new SKUs are created, existing SKUs are updated."
      >
        <div className="space-y-4">
          <Field
            label="CSV file"
            htmlFor="csv-file"
            hint="UTF-8 CSV, up to 500 product rows. A template is available below."
          >
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setFileName(file.name);
                setCsv(await file.text());
              }}
              className="block w-full rounded-lg border border-input bg-card px-3 py-2 text-[13px] file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-foreground"
            />
            {fileName ? <p className="mt-1 text-[11.5px] text-muted-foreground">Loaded {fileName}</p> : null}
          </Field>

          <Field label="Or paste CSV content" htmlFor="csv" required>
            <textarea
              id="csv"
              name="csv"
              rows={12}
              required
              value={csv}
              onChange={(event) => setCsv(event.target.value)}
              placeholder={"name,sku,barcode,category,supplier,description,costPrice,sellingPrice,reorderLevel,unit,taxRate,trackInventory,status,quantity\nCoca-Cola 1.5L,COKE-1500,,Drinks,,,12.00,18.00,10,bottle,15,true,active,24"}
              className="flex min-h-48 w-full rounded-lg border border-input bg-card px-3 py-2 font-mono text-[12px] text-foreground shadow-[0_1px_1px_rgb(16_35_27/2%)] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/12"
            />
          </Field>

          <div className="rounded-lg border border-border bg-muted/30 p-3.5 text-[12px] leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">How the import behaves</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>Required columns: <span className="font-mono">name</span> and <span className="font-mono">sku</span>.</li>
              <li>Missing categories and suppliers are created automatically.</li>
              <li>Opening stock is applied to new products only; existing stock is never overwritten.</li>
              <li>Amounts are in major units, e.g. <span className="font-mono">18.00</span>.</li>
            </ul>
          </div>
        </div>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Importing…">Import products</SubmitButton>
        <Button variant="outline" render={<Link href="/api/products/export?template=1" />} nativeButton={false}>
          Download template
        </Button>
        <Button variant="ghost" render={<Link href="/app/products" />} nativeButton={false}>
          Back to products
        </Button>
      </div>
    </form>
  );
}
