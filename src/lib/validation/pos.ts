import { z } from "zod";

export const saleMethodSchema = z.enum(["cash", "momo", "bank", "card", "credit"]);

export const createSaleSchema = z.object({
  // The branch and cashier always come from the signed-in session, so they are
  // never accepted from the browser.
  customerId: z.string().nullable().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().nullable().optional(),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1, "Add at least one product to the sale.")
    .max(50, "A single sale can contain at most 50 lines."),
  method: saleMethodSchema,
  amountPaidMinor: z.number().int().min(0),
  discountMinor: z.number().int().min(0).max(1_000_000_000).optional().default(0),
  notes: z.string().max(255).nullable().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
