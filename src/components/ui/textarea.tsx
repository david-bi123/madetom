import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-[84px] w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base text-foreground shadow-[0_1px_1px_rgb(16_35_27/2%)] transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/12 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-70 aria-invalid:border-destructive aria-invalid:ring-destructive/12 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
