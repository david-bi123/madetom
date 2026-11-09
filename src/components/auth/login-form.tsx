"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail } from "lucide-react";
import type { z } from "zod";
import { loginAction } from "@/app/(auth)/actions";
import { loginSchema } from "@/lib/validation/auth";
import { Field, FormError } from "@/components/forms/field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [serverError, setServerError] = useState<string>();

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: LoginValues) {
    setServerError(undefined);
    clearErrors();

    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);

    const result = await loginAction(formData);
    if (!result) return;

    if (result.fieldErrors) {
      for (const [key, messages] of Object.entries(result.fieldErrors)) {
        if (key === "email" || key === "password") {
          setError(key, { type: "server", message: messages[0] });
        }
      }
    }
    if (result.error && !result.fieldErrors) setServerError(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />

      <Field label="Email address" htmlFor="email" error={errors.email?.message} required>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
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

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="password" className="text-[13px] font-medium text-foreground">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="rounded text-[12px] font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password?.message ? (
          <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="h-11 w-full text-[14px]" loading={isSubmitting}>
        Sign in
        {!isSubmitting ? <ArrowRight className="size-4" aria-hidden /> : null}
      </Button>

      <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
        By signing in you agree to Madetom&apos;s acceptable use and data handling terms.
      </p>
    </form>
  );
}
