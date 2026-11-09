import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type NativeSelectProps = React.ComponentProps<"select">;

/**
 * A styled native select. Native controls keep forms accessible, keyboard
 * friendly and reliable on mobile while matching Madetom's input language.
 */
function NativeSelect({ className, children, ...props }: NativeSelectProps) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-input bg-card py-1 pr-9 pl-3 text-base text-foreground shadow-[0_1px_1px_rgb(16_35_27/2%)] transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/12 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-70 aria-invalid:border-destructive aria-invalid:ring-destructive/12 md:text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
