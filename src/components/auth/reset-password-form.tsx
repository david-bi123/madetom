"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import type { z } from "zod";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { Field, FormError } from "@/components/forms/field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ResetValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [serverError, setServerError] = useState<string>();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      code: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  async function onSubmit(values: ResetValues) {
    setServerError(undefined);
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("code", values.code);
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);

    const result = await resetPasswordAction(formData);
    if (!result) return;

    if (result.fieldErrors) {
      for (const [key, messages] of Object.entries(result.fieldErrors)) {
        if (key === "email" || key === "code" || key === "password" || key === "confirmPassword") {
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

      <Field
        label="6-digit code"
        htmlFor="code"
        error={errors.code?.message}
        hint="Found in the SMS we just sent. It expires in 15 minutes."
        required
      >
        <div className="relative">
          <KeyRound
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            aria-invalid={Boolean(errors.code)}
            className="h-11 rounded-xl pl-10 font-mono text-[17px] tracking-[0.36em]"
            {...register("code")}
          />
        </div>
      </Field>

      <Field
        label="New password"
        htmlFor="password"
        error={errors.password?.message}
        hint="At least 10 characters, including a letter and a number."
        required
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="Create a new password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
        required
      >
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat the new password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
      </Field>

      <Button type="submit" size="lg" className="h-11 w-full" loading={isSubmitting}>
        Set new password
        {!isSubmitting ? <ArrowRight className="size-4" aria-hidden /> : null}
      </Button>
    </form>
  );
}
