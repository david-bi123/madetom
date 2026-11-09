import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 text-[11px] font-semibold tracking-[0.01em] whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-primary/10 bg-primary/8 text-primary",
        secondary: "border-transparent bg-muted text-muted-foreground",
        success: "border-[#cfe7d8] bg-success-soft text-[#12623c]",
        warning: "border-[#f0dfbc] bg-warning-soft text-[#8a5209]",
        destructive: "border-[#f1d2cf] bg-danger-soft text-destructive",
        outline: "border-border bg-card text-muted-foreground",
        gold: "border-[#ead9b2] bg-gold-soft text-[#75540f]",
        dark: "border-transparent bg-ink text-[#f5f8f5]",
        ghost: "border-transparent bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
