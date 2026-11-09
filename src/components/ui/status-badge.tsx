import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "danger" | "neutral" | "info" | "gold";

const STATUS_TONES: Record<string, { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "success" },
  sent: { label: "Sent", tone: "success" },
  paid: { label: "Paid", tone: "success" },
  received: { label: "Received", tone: "success" },
  completed: { label: "Completed", tone: "success" },
  accepted: { label: "Accepted", tone: "success" },
  delivered: { label: "Delivered", tone: "success" },
  trial: { label: "Trial", tone: "info" },
  pending: { label: "Pending", tone: "warning" },
  partial: { label: "Part paid", tone: "warning" },
  draft: { label: "Draft", tone: "neutral" },
  low: { label: "Low stock", tone: "warning" },
  low_stock: { label: "Low stock", tone: "warning" },
  out_of_stock: { label: "Out of stock", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  revoked: { label: "Revoked", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
  refunded: { label: "Refunded", tone: "neutral" },
  past_due: { label: "Past due", tone: "danger" },
  cancelled_subscription: { label: "Cancelled", tone: "neutral" },
  archived: { label: "Archived", tone: "neutral" },
  queued: { label: "Queued", tone: "info" },
  info: { label: "Info", tone: "info" },
  success: { label: "Success", tone: "success" },
  warning: { label: "Warning", tone: "warning" },
  critical: { label: "Critical", tone: "danger" },
  owner: { label: "Owner", tone: "gold" },
  manager: { label: "Manager", tone: "info" },
  cashier: { label: "Cashier", tone: "neutral" },
  inventory_manager: { label: "Inventory Manager", tone: "neutral" },
  starter: { label: "Starter", tone: "neutral" },
  business: { label: "Business", tone: "info" },
  premium: { label: "Premium", tone: "gold" },
};

export function StatusBadge({
  status,
  className,
  label,
}: {
  status: string | null | undefined;
  className?: string;
  label?: string;
}) {
  const key = status ?? "unknown";
  const config = STATUS_TONES[key] ?? {
    label: label ?? key.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase()),
    tone: "neutral" as StatusTone,
  };
  const variant =
    config.tone === "success"
      ? "success"
      : config.tone === "warning"
        ? "warning"
        : config.tone === "danger"
          ? "destructive"
          : config.tone === "info"
            ? "default"
            : config.tone === "gold"
              ? "gold"
              : "secondary";
  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {label ?? config.label}
    </Badge>
  );
}
