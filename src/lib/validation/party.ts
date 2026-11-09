import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer's name.").max(120),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long.")
    .optional()
    .default(""),
  email: z
    .string()
    .trim()
    .max(160, "Email is too long.")
    .optional()
    .default("")
    .refine(
      (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "Enter a valid email address.",
    ),
  address: z.string().trim().max(255).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export type CustomerValues = z.infer<typeof customerSchema>;

export const customerSearchSchema = z.object({
  term: z.string().trim().max(120).optional().default(""),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Enter the supplier's name.").max(120),
  contactName: z.string().trim().max(120).optional().default(""),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long.")
    .optional()
    .default("")
    .refine(
      (value) => value === "" || /^[\d+\s()-]{7,30}$/.test(value),
      "Enter a valid phone number.",
    ),
  email: z
    .string()
    .trim()
    .max(160, "Email is too long.")
    .optional()
    .default("")
    .refine(
      (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "Enter a valid email address.",
    ),
  address: z.string().trim().max(255).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export type SupplierValues = z.infer<typeof supplierSchema>;
