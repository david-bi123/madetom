import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FormPageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={backHref} />}
        nativeButton={false}
        className="-ml-2 mb-3"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {backLabel}
      </Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
          <h1 className="font-heading text-[25px] leading-[1.15] font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
