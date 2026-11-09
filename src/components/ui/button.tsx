import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "cn";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity] duration-150 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/12%),0_1px_2px_rgb(16_35_27/12%)] hover:bg-[#0b4e3c] active:bg-[#093f31]",
        outline:
          "border-border bg-card text-foreground shadow-[0_1px_2px_rgb(16_35_27/4%)] hover:border-[#cbd4c8] hover:bg-muted/60 active:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[#dfe9e1] active:bg-[#d5e2d8]",
        soft: "bg-primary/8 text-primary hover:bg-primary/12 active:bg-primary/15",
        ghost: "text-foreground hover:bg-muted/80 active:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_1px_2px_rgb(80_20_15/15%)] hover:bg-[#981b12] active:bg-[#84170f]",
        "destructive-soft":
          "bg-destructive/8 text-destructive hover:bg-destructive/13 active:bg-destructive/18",
        gold: "bg-gold text-[#241a05] shadow-[0_1px_2px_rgb(60_40_10/20%)] hover:bg-[#b88720] active:bg-[#a97918]",
        link: "h-auto p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 gap-1.5 rounded-[8px] px-3 text-[13px]",
        lg: "h-10 gap-2 px-4 text-sm",
        icon: "size-9",
        "icon-sm": "size-8 rounded-[8px]",
        "icon-xs": "size-7 rounded-[7px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
