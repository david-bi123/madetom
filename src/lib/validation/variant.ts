import { z } from "zod";

export const variantFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a variant name.").max(120, "Variant name is too long."),
  sku: z.string().trim().min(1, "Enter a SKU for this variant.").max(64, "SKU is too long."),
  barcode: z.string().trim().max(64, "Barcode is too long.").nullable(),
  costPrice: z.string().trim().min(0, "Cost cannot be negative.").max(12, "Cost is too large."),
  sellingPrice: z.string().trim().min(0, "Selling price cannot be negative.").max(12, "Selling price is too large."),
  reorderLevel: z
    .string()
    .trim()
    .min(0, "Reorder level cannot be negative.")
    .max(3, "Reorder level is too large.")
    .transform((value) => Number(value) || 0),
  status: z.enum(["active", "archived"]),
});

export type VariantFormValues = z.infer<typeof variantFormSchema>;
