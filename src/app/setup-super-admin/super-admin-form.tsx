"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { setupSuperAdmin } from "@/app/setup-super-admin/actions";
import { normalizePhone } from "@/lib/format";
import { Field, FormError } from "@/components/forms/field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .refine((v) => {
    const normalized = normalizePhone(v);
    return /^\+\d{9,15}$/.test(normalized);
  }, "Enter a valid phone number, e.g. 055 062 4203.");

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(120),
    email: z.string().trim().email("Enter a valid email address."),
    phone: phoneSchema,
    password: z
      .string()
      .min(10, "Use at least 10 characters.")
      .max(128, "Password is too long.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type SetupValues = z.infer<typeof schema>;

export function SetupSuperAdminForm() {
  const [serverError, setServerError] = useState<string>();

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SetupValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: SetupValues) {
    setServerError(undefined);
    clearErrors();

    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("email", values.email);
    formData.set("phone", values.phone);
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);

    const result = await setupSuperAdmin(formData);
    if (!result) return;

    if (result.fieldErrors) {
      for (const [key, messages] of Object.entries(result.fieldErrors)) {
        setError(key as keyof SetupValues, { type: "server", message: messages[0] });
      }
    }
    if (result.error && !result.fieldErrors) setServerError(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />

      <Field label="Full name" htmlFor="name" error={errors.name?.message} required>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Ama Mensah"
          aria-invalid={Boolean(errors.name)}
          className="h-11 rounded-xl text-[15px]"
          {...register("name")}
        />
      </Field>

      <Field label="Email address" htmlFor="email" error={errors.email?.message} required>
        <div className="relative">
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@business.com"
            aria-invalid={Boolean(errors.email)}
            className="h-11 rounded-xl pl-10 text-[15px]"
            {...register("email")}
          />
        </div>
      </Field>

      <Field label="Phone number" htmlFor="phone" error={errors.phone?.message} required>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="055 062 4203"
          aria-invalid={Boolean(errors.phone)}
          className="h-11 rounded-xl text-[15px]"
          {...register("phone")}
        />
      </Field>

      <div>
        <label htmlFor="password" className="text-[13px] font-medium text-foreground">
          Password
        </label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password?.message ? (
          <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="text-[13px] font-medium text-foreground">
          Confirm password
        </label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword?.message ? (
          <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="h-11 w-full text-[14px]" loading={isSubmitting}>
        Create super admin account
        {!isSubmitting ? <ArrowRight className="size-4" aria-hidden /> : null}
      </Button>

      <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
        Only one super admin account can be created. Keep your login details safe.
      </p>
    </form>
  );
}
