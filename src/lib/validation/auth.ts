import { z } from "zod";
import { isValidPhone } from "@/lib/format";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(160, "Email is too long.")
  .email("Enter a valid email address.");

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .max(30, "Phone number is too long.")
  .refine(isValidPhone, "Enter a valid phone number, e.g. 024 123 4567.");

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Password is too long.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code from your SMS."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const taxRateSchema = z
  .string()
  .trim()
  .min(1, "Enter a tax rate. Use 0 if you do not charge tax.")
  .refine((value) => {
    const rate = Number(value);
    return Number.isFinite(rate) && rate >= 0 && rate <= 100;
  }, "Enter a tax rate between 0 and 100.");

const ownerFields = {
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: phoneSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm your password."),
  businessName: z.string().trim().min(2, "Enter your business name.").max(160),
  businessType: z.string().trim().min(2, "Enter your business type.").max(80),
  region: z.string().trim().min(1, "Select or enter a region.").max(80),
  location: z.string().trim().min(2, "Enter the business location.").max(255),
  branchName: z.string().trim().min(2, "Name your main branch.").max(120),
  branchAddress: z.string().trim().min(2, "Enter the branch address.").max(255),
  taxRate: taxRateSchema,
  pricesIncludeTax: z.boolean(),
  allowPartialPayments: z.boolean(),
};

export const ownerSetupFormSchema = z.object(ownerFields).refine(
  (data) => data.password === data.confirmPassword,
  { message: "Passwords do not match.", path: ["confirmPassword"] },
);

export const setupOwnerSchema = z
  .object({
    token: z.string().min(1),
    ...ownerFields,
    acceptTerms: z.literal(true, { message: "You must accept the terms to continue." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const staffFields = {
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm your password."),
};

export const staffSetupFormSchema = z.object(staffFields).refine(
  (data) => data.password === data.confirmPassword,
  { message: "Passwords do not match.", path: ["confirmPassword"] },
);

export const setupStaffSchema = z
  .object({
    token: z.string().min(1),
    ...staffFields,
    acceptTerms: z.literal(true, { message: "You must accept the terms to continue." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
