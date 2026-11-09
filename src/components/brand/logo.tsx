import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  inverse?: boolean;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export function Logo({ className, inverse = false, showWordmark = true, wordmarkClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="size-8 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="11" fill={inverse ? "#E8C46D" : "#0F5C47"} />
        <path
          d="M9.5 28.5V14.2L20 22.3l10.5-8.1v14.3"
          stroke={inverse ? "#0B1F19" : "#F7F2E5"}
          strokeWidth="3.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="30.7" cy="10.3" r="2.5" fill={inverse ? "#F6F7F3" : "#E8C46D"} />
      </svg>
      {showWordmark ? (
        <span
          className={cn(
            "font-heading text-[21px] leading-none font-semibold tracking-[-0.045em]",
            inverse ? "text-[#F4F7F3]" : "text-ink",
            wordmarkClassName,
          )}
        >
          madetom
        </span>
      ) : null}
    </span>
  );
}

export function LogoLockup({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Logo inverse={inverse} />
      <span
        className={cn(
          "pl-[42px] text-[9px] font-medium tracking-[0.16em] uppercase",
          inverse ? "text-[#9DB4A8]" : "text-muted-foreground",
        )}
      >
        Your trade, under control
      </span>
    </div>
  );
}
