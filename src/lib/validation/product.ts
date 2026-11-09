import { z } from "zod";

export const productStatusSchema = z.enum(["active", "archived"]);

const booleanField = z.string().default("false").transform((value) => value === "true");

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the product name.").max(160, "Product name is too long."),
  sku: z.string().trim().min(1, "Enter a SKU for this product.").max(64, "SKU is too long."),
  barcode: z.string().trim().max(64, "Barcode is too long.").nullable(),
  categoryId: z.string().trim().max(36, "Category is invalid.").nullable(),
  supplierId: z.string().trim().max(36, "Supplier is invalid.").nullable(),
  description: z.string().trim().max(1000, "Description is too long.").nullable(),
  imageUrl: z.string().trim().max(500, "Image URL is too long.").nullable(),
  costPrice: z.string().trim().min(0, "Cost cannot be negative.").max(12, "Cost is too large."),
  sellingPrice: z.string().trim().min(0, "Selling price cannot be negative.").max(12, "Selling price is too large."),
  reorderLevel: z.string().trim().min(0, "Reorder level cannot be negative.").max(3, "Reorder level is too large.").transform((value) => Number(value) || 0),
  unit: z.string().trim().min(1, "Unit is required.").max(24, "Unit is too long."),
  taxRate: z.string().trim().max(6, "Tax rate is too long.").nullable(),
  hasVariants: booleanField,
  trackInventory: booleanField,
  status: productStatusSchema,
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
