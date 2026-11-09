import * as React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="font-heading text-[25px] leading-[1.15] font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  tone = "default",
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  tone?: "default" | "gold" | "warning" | "critical";
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md",
              tone === "gold"
                ? "bg-gold-soft text-[#8a641a]"
                : tone === "warning"
                  ? "bg-warning-soft text-warning"
                  : tone === "critical"
                    ? "bg-danger-soft text-destructive"
                    : "bg-primary/7 text-primary",
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.9} aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-heading text-[27px] leading-none font-semibold tracking-[-0.04em] text-ink tabular">
        {value}
      </p>
      <div className="mt-2 flex min-h-4 items-center gap-1.5 text-[11.5px] text-muted-foreground">
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold tabular",
              trend.value >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {trend.value >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
        ) : null}
        {hint ? <span className="truncate">{hint}</span> : null}
      </div>
    </>
  );

  const classes = cn(
    "group rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-colors",
    href && "hover:border-[#cdd8cf] hover:bg-card",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  return <div className={classes}>{content}</div>;
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h2 className="font-heading text-[15px] font-semibold tracking-[-0.015em]">{title}</h2>
        {description ? <p className="mt-0.5 text-[12.5px] text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="dot-paper mb-4 flex size-16 items-center justify-center rounded-2xl border border-border/80 bg-muted/30">
        <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-[var(--shadow-card)]">
          <Icon className="size-5" strokeWidth={1.7} aria-hidden />
        </span>
      </div>
      <h3 className="font-heading text-[15px] font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function InlineHint({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warning" | "danger" | "success" }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed",
        tone === "warning"
          ? "bg-warning-soft text-[#7c4b08]"
          : tone === "danger"
            ? "bg-danger-soft text-destructive"
            : tone === "success"
              ? "bg-success-soft text-[#12623c]"
              : "bg-muted/70 text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}
