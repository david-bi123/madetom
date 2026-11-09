import { z } from "zod";
import { emailSchema, phoneSchema } from "./auth";

export const businessSettingsSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name.").max(160, "Business name is too long."),
  businessType: z.string().trim().min(2, "Enter the type of business.").max(80),
  region: z.string().trim().max(80).nullable(),
  location: z.string().trim().max(255).nullable(),
  phone: phoneSchema,
  email: emailSchema,
  taxRate: z
    .string()
    .trim()
    .min(1, "Enter a tax rate. Use 0 if you do not charge tax.")
    .refine((value) => {
      const rate = Number(value);
      return Number.isFinite(rate) && rate >= 0 && rate <= 100;
    }, "Enter a tax rate between 0 and 100."),
  pricesIncludeTax: z.string().default("false").transform((value) => value === "true"),
  allowPartialPayments: z.string().default("false").transform((value) => value === "true"),
});

export type BusinessSettingsValues = z.infer<typeof businessSettingsSchema>;
