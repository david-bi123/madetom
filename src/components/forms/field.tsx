import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
  labelClassName,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className={cn("flex items-center gap-1 text-[13px] font-medium text-foreground", labelClassName)}
      >
        {label}
        {required ? (
          <span aria-hidden className="text-destructive">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs leading-relaxed font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormGrid({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)} {...props} />;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6", className)}>
      <div className="mb-5 border-b border-border/70 pb-4">
        <h2 className="font-heading text-[16px] font-semibold tracking-[-0.015em]">{title}</h2>
        {description ? <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-[#f1d2cf] bg-danger-soft px-3.5 py-2.5 text-[13px] leading-relaxed font-medium text-destructive"
    >
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="rounded-lg border border-[#cfe7d8] bg-success-soft px-3.5 py-2.5 text-[13px] leading-relaxed font-medium text-[#12623c]"
    >
      {message}
    </div>
  );
}
