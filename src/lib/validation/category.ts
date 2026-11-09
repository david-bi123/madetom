import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter a category name.")
    .max(80, "Category name is too long."),
  description: z.string().trim().max(255, "Description is too long.").nullable(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
