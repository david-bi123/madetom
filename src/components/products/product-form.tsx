"use client";

/* eslint-disable @next/next/no-img-element -- product images are arbitrary remote URLs */

import Link from "next/link";
import { useActionState, useState } from "react";
import { ImagePlus } from "lucide-react";
import { createProduct, updateProduct } from "@/app/(business)/app/products/actions";
import { initialActionState } from "@/lib/action-state";
import { FormGrid, FormSection, FormError, Field, FormSuccess } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { ProductFormValues } from "@/lib/validation/product";

type ProductFormProps = {
  mode: "create" | "update";
  product?: ProductFormValues & { id: string };
  categories: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
};

export function ProductForm({ mode, product, categories, suppliers }: ProductFormProps) {
  const [state, formAction] = useActionState(
    mode === "create" ? createProduct : updateProduct,
    initialActionState,
  );
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();

  const values: ProductFormValues = product
    ? {
        name: product.name,
        sku: product.sku,
        barcode: product.barcode ?? null,
        categoryId: product.categoryId ?? null,
        supplierId: product.supplierId ?? null,
        description: product.description ?? null,
        imageUrl: product.imageUrl ?? null,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        reorderLevel: product.reorderLevel,
        unit: product.unit,
        taxRate: product.taxRate ?? null,
        hasVariants: product.hasVariants,
        trackInventory: product.trackInventory,
        status: product.status,
      }
    : {
        name: "",
        sku: "",
        barcode: null,
        categoryId: null,
        supplierId: null,
        description: null,
        imageUrl: null,
        costPrice: "0",
        sellingPrice: "0",
        reorderLevel: 5,
        unit: "piece",
        taxRate: null,
        hasVariants: false,
        trackInventory: true,
        status: "active",
      };

  async function uploadImage(file: File) {
    setUploadError(undefined);
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/uploads/cloudinary", { method: "POST", body });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setUploadError(payload.error ?? "The image could not be uploaded.");
        return;
      }
      setImageUrl(payload.url);
    } catch {
      setUploadError("The image could not be uploaded. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {mode === "update" && <input type="hidden" name="id" value={product?.id} />}

      <FormSection title="Product" description="The item you sell. Details are snapshotted on each sale line.">
        <FormGrid>
          <Field label="Product name" htmlFor="name" required className="sm:col-span-2">
            <Input id="name" name="name" required defaultValue={values.name} className="h-9 text-[13px]" />
          </Field>
          <Field label="SKU" htmlFor="sku" required>
            <Input id="sku" name="sku" required defaultValue={values.sku} className="h-9 font-mono text-[13px]" />
          </Field>
          <Field label="Barcode" htmlFor="barcode">
            <Input id="barcode" name="barcode" defaultValue={values.barcode ?? ""} className="h-9 font-mono text-[13px]" />
          </Field>
          <Field label="Category" htmlFor="categoryId">
            <NativeSelect id="categoryId" name="categoryId" defaultValue={values.categoryId ?? ""}>
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Supplier" htmlFor="supplierId">
            <NativeSelect id="supplierId" name="supplierId" defaultValue={values.supplierId ?? ""}>
              <option value="">None</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Description" htmlFor="description" className="sm:col-span-2">
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={values.description ?? ""}
              className="flex min-h-16 w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground shadow-[0_1px_1px_rgb(16_35_27/2%)] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/12 disabled:cursor-not-allowed disabled:bg-muted/60 md:text-sm"
            />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Product image" description="Upload a photo when Cloudinary is configured, or paste an image URL.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
            {imageUrl ? (
              <img src={imageUrl} alt="Product preview" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <Field label="Image file" htmlFor="imageFile" hint="JPG, PNG, WebP or GIF up to 5 MB.">
              <input
                id="imageFile"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadImage(file);
                }}
                className="block w-full rounded-lg border border-input bg-card px-3 py-2 text-[13px] file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-foreground"
              />
            </Field>
            <Field label="Image URL" htmlFor="imageUrl" error={uploadError}>
              <Input
                id="imageUrl"
                name="imageUrl"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://res.cloudinary.com/…"
                className="h-9 text-[13px]"
              />
            </Field>
            {uploading ? <p className="text-[11.5px] text-muted-foreground">Uploading…</p> : null}
            {imageUrl ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl("")}>
                Remove image
              </Button>
            ) : null}
          </div>
        </div>
      </FormSection>

      <FormSection title="Pricing & stock" description="Prices are stored in major units; stock is tracked per branch.">
        <FormGrid>
          <Field label="Cost price" htmlFor="costPrice" required>
            <Input id="costPrice" name="costPrice" inputMode="decimal" defaultValue={values.costPrice} required className="h-9 text-[13px]" />
          </Field>
          <Field label="Selling price" htmlFor="sellingPrice" required>
            <Input id="sellingPrice" name="sellingPrice" inputMode="decimal" defaultValue={values.sellingPrice} required className="h-9 text-[13px]" />
          </Field>
          <Field label="Reorder level" htmlFor="reorderLevel">
            <Input id="reorderLevel" name="reorderLevel" type="number" min={0} max={999} defaultValue={String(values.reorderLevel)} className="h-9 text-[13px]" />
          </Field>
          <Field label="Unit" htmlFor="unit">
            <Input id="unit" name="unit" defaultValue={values.unit} className="h-9 text-[13px]" />
          </Field>
          <Field label="Tax rate %" htmlFor="taxRate">
            <Input id="taxRate" name="taxRate" inputMode="decimal" defaultValue={values.taxRate ?? ""} className="h-9 text-[13px]" />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Inventory & visibility">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3.5 text-[13px]">
            <input type="checkbox" name="trackInventory" value="true" defaultChecked={values.trackInventory} className="mt-0.5 size-4 accent-primary" />
            <span>
              <span className="block font-semibold">Track stock</span>
              <span className="mt-0.5 block text-muted-foreground">Count stock movements for this product.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3.5 text-[13px]">
            <input type="checkbox" name="hasVariants" value="true" defaultChecked={values.hasVariants} className="mt-0.5 size-4 accent-primary" />
            <span>
              <span className="block font-semibold">This product has variants</span>
              <span className="mt-0.5 block text-muted-foreground">Sizes, flavours or bundles tracked separately.</span>
            </span>
          </label>
        </div>
      </FormSection>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…">{mode === "create" ? "Create product" : "Save product"}</SubmitButton>
        <Button variant="outline" render={<Link href="/app/products" />} nativeButton={false}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
