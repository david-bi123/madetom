import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(2, "Describe the expense.").max(255),
  amount: z
    .string()
    .trim()
    .min(1, "Enter the amount.")
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) > 0,
      "Enter an amount above zero.",
    ),
  expenseDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date the expense was paid."),
  paymentMethod: z.enum(["cash", "momo", "bank", "card", "other"]),
  reference: z.string().trim().max(120).optional().default(""),
});

export type ExpenseValues = z.infer<typeof expenseSchema>;
