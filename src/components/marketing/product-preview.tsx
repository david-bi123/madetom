import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Boxes,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Landmark,
  MapPin,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Users,
} from "lucide-react";
import { formatMoney } from "@/lib/format";

export function ProductPreview({ currency = "GHS" }: { currency?: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[580px] select-none" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_top_right,rgb(226_196_109/22%),transparent_62%)]" />

      <div className="overflow-hidden rounded-2xl border border-[#d9e1d7] bg-[#fcfdfa] shadow-[0_2px_5px_rgb(16_35_27/5%),0_28px_70px_-28px_rgb(16_35_27/35%)]">
        <div className="flex items-center justify-between border-b border-[#e7ebe3] bg-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary font-heading text-[11px] font-bold text-white">
              A
            </span>
            <div>
              <p className="text-[11px] leading-none font-semibold text-ink">Adom Provisions</p>
              <p className="mt-1 text-[9px] leading-none text-muted-foreground">Adabraka Shop</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-1 text-[9px] font-medium text-muted-foreground">
              Today
            </span>
            <span className="flex size-6 items-center justify-center rounded-full bg-gold-soft text-[9px] font-semibold text-[#6f4e0d]">
              AM
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] font-medium tracking-wide text-muted-foreground uppercase">Today&apos;s sales</p>
              <p className="mt-1 font-heading text-[26px] leading-none font-semibold tracking-[-0.04em] text-ink tabular">
                {formatMoney(1284, currency)}
              </p>
            </div>
            <span className="rounded-md bg-success-soft px-2 py-1 text-[9px] font-semibold text-success">
              +12.4% vs yesterday
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Transactions", value: "32" },
              { label: "Gross profit", value: formatMoney(418, currency) },
              { label: "Low stock", value: "4" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-[#e7ebe3] bg-white p-2.5">
                <p className="text-[8.5px] text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-[12px] font-semibold text-ink tabular">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-[#e7ebe3] bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-ink">Sales this week</p>
              <p className="text-[9px] text-muted-foreground">Mon – Sun</p>
            </div>
            <div className="mt-3 flex h-[88px] items-end gap-2">
              {[36, 52, 44, 66, 58, 83, 71].map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex h-[70px] w-full items-end">
                    <div
                      className={index === 5 ? "w-full rounded-t-[3px] bg-primary" : "w-full rounded-t-[3px] bg-[#dce9df]"}
                      style={{ height: `${height}%` }}
                    />
                    {index === 5 ? (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded bg-ink px-1 py-0.5 text-[7px] font-medium text-white">
                        {formatMoney(724, currency, { hideSymbol: true })}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[7.5px] text-muted-foreground">
                    {["M", "T", "W", "T", "F", "S", "S"][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-[#e7ebe3] bg-white">
            <div className="flex items-center justify-between border-b border-[#eef1eb] px-3 py-2">
              <p className="text-[10px] font-semibold text-ink">Recent sales</p>
              <span className="flex items-center gap-0.5 text-[8.5px] font-medium text-primary">
                View all <ChevronRight className="size-2.5" />
              </span>
            </div>
            {[
              { receipt: "MT-00184", method: "Cash", icon: Banknote, amount: 86.5, time: "2m" },
              { receipt: "MT-00183", method: "Mobile Money", icon: Smartphone, amount: 142, time: "9m" },
            ].map((sale) => (
              <div key={sale.receipt} className="flex items-center justify-between border-b border-[#f2f4f0] px-3 py-2 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded bg-muted text-muted-foreground">
                    <sale.icon className="size-2.5" />
                  </span>
                  <div>
                    <p className="text-[8.5px] font-medium text-ink">{sale.receipt}</p>
                    <p className="text-[7.5px] text-muted-foreground">{sale.method} · {sale.time} ago</p>
                  </div>
                </div>
                <p className="text-[9px] font-semibold text-ink tabular">{formatMoney(sale.amount, currency)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-7 -left-3 w-[210px] rounded-xl border border-[#e4e8e0] bg-white p-3.5 shadow-[0_14px_35px_-12px_rgb(16_35_27/30%)] sm:-left-8">
        <div className="flex items-center justify-between border-b border-dashed border-border pb-2">
          <div className="flex items-center gap-1.5">
            <Receipt className="size-3 text-primary" />
            <span className="text-[9px] font-semibold text-ink">Receipt MT-00184</span>
          </div>
          <span className="text-[8px] text-muted-foreground">14:32</span>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex justify-between text-[8px] text-muted-foreground">
            <span>Rice 5kg × 1</span>
            <span className="tabular">{formatMoney(72, currency)}</span>
          </div>
          <div className="flex justify-between text-[8px] text-muted-foreground">
            <span>Cooking oil × 1</span>
            <span className="tabular">{formatMoney(26, currency)}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="text-[8px] text-muted-foreground">Total paid · Cash</span>
          <span className="text-[10px] font-semibold text-ink tabular">{formatMoney(98, currency)}</span>
        </div>
      </div>

      <div className="absolute -top-4 -right-2 flex items-center gap-2 rounded-lg border border-[#eddab2] bg-[#fffaf0] px-3 py-2 shadow-[0_8px_24px_-12px_rgb(16_35_27/25%)] sm:-right-6">
        <span className="flex size-6 items-center justify-center rounded-md bg-warning-soft text-warning">
          <CircleAlert className="size-3" />
        </span>
        <div>
          <p className="text-[8.5px] font-semibold text-[#6f4e0d]">Low stock</p>
          <p className="text-[7.5px] text-[#8a6a2c]">Plantain chips · 5 left</p>
        </div>
      </div>
    </div>
  );
}

export function PosPreview({ currency = "GHS" }: { currency?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-raised)]" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/8 text-primary">
            <ShoppingBag className="size-3" />
          </span>
          <span className="text-[11px] font-semibold">Point of sale</span>
        </div>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">Adabraka</span>
      </div>
      <div className="grid grid-cols-[1fr_150px] gap-3 p-3">
        <div>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1.5 text-[8px] text-muted-foreground">
            <Search className="size-2.5" />
            Search or scan a barcode…
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[
              { name: "Rice 5kg", price: 72 },
              { name: "Cooking oil", price: 26 },
              { name: "Milo 400g", price: 34 },
              { name: "Ideal milk", price: 13 },
              { name: "Sachet water", price: 5 },
              { name: "Voltic 750ml", price: 6 },
            ].map((product) => (
              <div key={product.name} className="rounded-md border border-border bg-white p-1.5">
                <div className="mb-1.5 flex h-8 items-center justify-center rounded bg-[#f3f6f1] font-heading text-[9px] font-semibold text-primary/50">
                  {product.name.slice(0, 2)}
                </div>
                <p className="truncate text-[7.5px] font-medium text-ink">{product.name}</p>
                <p className="text-[7px] font-semibold text-muted-foreground tabular">{formatMoney(product.price, currency)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col rounded-lg border border-border bg-[#fbfcfa] p-2">
          <p className="text-[8px] font-semibold">Current sale</p>
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between text-[7.5px]">
              <span className="text-muted-foreground">Rice 5kg × 1</span>
              <span className="font-medium tabular">{formatMoney(72, currency)}</span>
            </div>
            <div className="flex justify-between text-[7.5px]">
              <span className="text-muted-foreground">Cooking oil × 1</span>
              <span className="font-medium tabular">{formatMoney(26, currency)}</span>
            </div>
          </div>
          <div className="mt-auto border-t border-border pt-2">
            <div className="flex justify-between text-[8px]">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold tabular">{formatMoney(98, currency)}</span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 rounded-md bg-primary py-1.5 text-[8px] font-semibold text-white">
              Charge {formatMoney(98, currency)} <ChevronRight className="size-2.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InventoryPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-raised)]" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Boxes className="size-3.5 text-primary" />
          <span className="text-[11px] font-semibold">Inventory</span>
        </div>
        <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[8px] font-medium text-warning">4 low</span>
      </div>
      <div className="divide-y divide-border/70">
        {[
          { name: "Royal Feast Rice 5kg", sku: "ADOM-RICE", stock: "46", status: "In stock" },
          { name: "Instant Coffee 200g", sku: "ADOM-COFFEE", stock: "2", status: "Out at main" },
          { name: "Plantain Chips 100g", sku: "ADOM-CHIPS", stock: "8", status: "Low" },
          { name: "Eggs Crate (30)", sku: "ADOM-EGGS", stock: "10", status: "Low" },
        ].map((item) => (
          <div key={item.sku} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex size-6 items-center justify-center rounded bg-muted font-heading text-[8px] font-semibold text-muted-foreground">
              {item.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-medium">{item.name}</p>
              <p className="text-[7.5px] text-muted-foreground">{item.sku}</p>
            </div>
            <span className="text-[8px] font-medium tabular">{item.stock} units</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[7px] font-medium ${
                item.status === "In stock"
                  ? "bg-success-soft text-success"
                  : item.status === "Low"
                    ? "bg-warning-soft text-warning"
                    : "bg-danger-soft text-destructive"
              }`}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RolePreview() {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {[
        { icon: ShieldCheck, role: "Owner", text: "Everything, including profit and team access.", tone: "gold" },
        { icon: BarChart3, role: "Manager", text: "Selling, stock and purchasing. No settings.", tone: "green" },
        { icon: Banknote, role: "Cashier", text: "The till and customers. No financial reports.", tone: "blue" },
        { icon: Boxes, role: "Inventory Manager", text: "Products, suppliers and stock. No sales data.", tone: "clay" },
      ].map((role) => (
        <div key={role.role} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
              role.tone === "gold"
                ? "bg-gold-soft text-[#7a5a14]"
                : role.tone === "green"
                  ? "bg-primary/8 text-primary"
                  : role.tone === "blue"
                    ? "bg-[#eaf2f5] text-[#3f6c79]"
                    : "bg-[#f8ece5] text-[#995334]"
            }`}
          >
            <role.icon className="size-3.5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold">{role.role}</p>
            <p className="text-[8.5px] leading-relaxed text-muted-foreground">{role.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PaymentsRow() {
  const methods = [
    { icon: Banknote, label: "Cash" },
    { icon: Smartphone, label: "Mobile Money" },
    { icon: Landmark, label: "Bank transfer" },
    { icon: CreditCard, label: "Card" },
  ];
  return (
    <div className="flex flex-wrap gap-2" aria-hidden="true">
      {methods.map((method) => (
        <span
          key={method.label}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-[11px] font-medium text-muted-foreground"
        >
          <method.icon className="size-3.5 text-primary" />
          {method.label}
        </span>
      ))}
    </div>
  );
}

export function LocationBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      <MapPin className="size-3 text-primary" />
      {children}
    </span>
  );
}

export function VerifiedNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
      <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
      {children}
    </p>
  );
}

export function TeamNote() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Users className="size-3.5 text-primary" /> Accounts are created by the Madetom team.
    </span>
  );
}
