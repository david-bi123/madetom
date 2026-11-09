import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between border-t border-border/80 px-4 py-3 text-[12px] text-muted-foreground">
        <span>{total} {total === 1 ? "record" : "records"}</span>
      </div>
    );
  }

  const hrefFor = (nextPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] text-muted-foreground tabular">
        Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          render={page > 1 ? <Link href={hrefFor(page - 1)} /> : undefined}
        >
          <ChevronLeft className="size-4" /> Previous
        </Button>
        <span className="px-1 text-[12px] text-muted-foreground tabular">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          render={page < totalPages ? <Link href={hrefFor(page + 1)} /> : undefined}
        >
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function SearchForm({
  action,
  defaultValue,
  placeholder = "Search…",
  name = "q",
  className,
  children,
}: {
  action: string;
  defaultValue?: string;
  placeholder?: string;
  name?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <form action={action} className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative min-w-[190px] flex-1 sm:max-w-xs">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-base shadow-[0_1px_1px_rgb(16_35_27/2%)] outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary focus:ring-[3px] focus:ring-primary/12 md:text-sm"
        />
      </div>
      {children}
      <Button type="submit" variant="outline" size="sm" className="h-9">
        Filter
      </Button>
    </form>
  );
}
