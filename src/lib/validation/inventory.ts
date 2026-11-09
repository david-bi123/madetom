import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  productId: z.string().trim().min(1, "Choose a product.").max(36),
  variantId: z.string().trim().max(36).nullable().optional(),
  type: z.enum(["increase", "decrease", "set"]),
  quantity: z.coerce
    .number({ message: "Enter a quantity." })
    .int("Use a whole number of units.")
    .min(0, "Enter zero or more units."),
  reason: z.string().trim().min(2, "Give a reason for the adjustment.").max(120),
  notes: z.string().trim().max(255).optional().default(""),
});

export const stockTransferSchema = z.object({
  productId: z.string().trim().min(1, "Choose a product.").max(36),
  variantId: z.string().trim().max(36).nullable().optional(),
  toBranchId: z.string().trim().min(1, "Choose the receiving branch.").max(36),
  quantity: z.coerce
    .number({ message: "Enter a quantity." })
    .int("Use a whole number of units.")
    .min(1, "Transfer at least one unit."),
  notes: z.string().trim().max(255).optional().default(""),
});

export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>;
export type StockTransferValues = z.infer<typeof stockTransferSchema>;
