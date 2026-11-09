import { TriangleAlert } from "lucide-react";

export function MaintenanceBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 border-b border-warning/30 bg-warning-soft px-4 py-2.5 text-warning-foreground sm:px-6 lg:px-8"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p className="text-[12.5px] leading-relaxed">{message}</p>
    </div>
  );
}
