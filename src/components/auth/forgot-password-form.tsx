"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail } from "lucide-react";
import type { z } from "zod";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ForgotValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string>();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: ForgotValues) {
    setServerError(undefined);
    const formData = new FormData();
    formData.set("email", values.email);

    const result = await forgotPasswordAction(formData);
    if (!result) return;

    if (result.fieldErrors?.email?.[0]) {
      setError("email", { type: "server", message: result.fieldErrors.email[0] });
    }
    if (result.error && !result.fieldErrors) setServerError(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />

      <Field
        label="Email address"
        htmlFor="email"
        error={errors.email?.message}
        hint="Use the email address on your Madetom account."
        required
      >
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

      <Button type="submit" size="lg" className="h-11 w-full" loading={isSubmitting}>
        Send reset code
        {!isSubmitting ? <ArrowRight className="size-4" aria-hidden /> : null}
      </Button>
    </form>
  );
}
