"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Landmark,
  Plus,
  ReceiptText,
  ScanBarcode,
  Search,
  Smartphone,
  Trash2,
} from "lucide-react";
import { completePosSale } from "@/app/(business)/app/pos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMinor, formatMoney, toMinor } from "@/lib/format";

export type PosProduct = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  quantity: number;
  costPrice: string;
  sellingPrice: string;
  categoryId: string | null;
};

export type PosCategory = { id: string; name: string };
export type PosCustomer = { id: string; name: string; phone: string | null };

type PosTerminalProps = {
  branchName: string;
  tenantName: string;
  userName: string;
  products: PosProduct[];
  categories: PosCategory[];
  customers: PosCustomer[];
  tenant: { name: string; currency: string; taxRate: string; pricesIncludeTax: boolean };
};

type PosMethod = "cash" | "momo" | "bank" | "card" | "credit";
type DiscountType = "amount" | "percent";

type CartLine = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  unitCostMinor: number;
  unitPriceMinor: number;
};

const METHODS: Array<{ key: PosMethod; label: string; icon: typeof Banknote }> = [
  { key: "cash", label: "Cash", icon: Banknote },
  { key: "momo", label: "Mobile Money", icon: Smartphone },
  { key: "bank", label: "Bank transfer", icon: Landmark },
  { key: "card", label: "Card", icon: CreditCard },
  { key: "credit", label: "Credit", icon: CreditCard },
];

export function PosTerminal({ branchName, products, categories, customers, tenant }: PosTerminalProps) {
  const [query, setQuery] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [method, setMethod] = useState<PosMethod>("cash");
  const [amountMinor, setAmountMinor] = useState("0");
  const [discountType, setDiscountType] = useState<DiscountType>("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  const [scanMessage, setScanMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const inCategory = categoryId === "all" || product.categoryId === categoryId;
      if (!inCategory) return false;
      if (!needle) return true;
      return (
        product.name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle) ||
        (product.barcode ?? "").toLowerCase().includes(needle)
      );
    });
  }, [products, query, categoryId]);

  const totals = useMemo(() => {
    // Mirror the server: selling prices are gross when the workspace includes
    // tax, so the net line value is price / (1 + tax). A sale-level discount is
    // shared across lines in proportion to each line's net value.
    const taxFraction = Number(tenant.taxRate) / 100;
    const lines = cart.map((line) => ({
      quantity: line.quantity,
      netUnitMinor: tenant.pricesIncludeTax
        ? Math.round(line.unitPriceMinor / (1 + taxFraction))
        : line.unitPriceMinor,
      cogsMinor: line.unitCostMinor,
    }));

    let netSubtotalMinor = 0;
    let cogsMinor = 0;
    for (const line of lines) {
      netSubtotalMinor += line.netUnitMinor * line.quantity;
      cogsMinor += line.cogsMinor * line.quantity;
    }

    const requestedDiscountMinor =
      discountType === "amount"
        ? toMinor(discountValue || "0")
        : Math.round((netSubtotalMinor * (Number(discountValue) || 0)) / 100);
    const discountMinor = Math.max(0, Math.min(requestedDiscountMinor, netSubtotalMinor));

    let allocatedDiscountMinor = 0;
    let discountedNetMinor = 0;
    let taxMinor = 0;
    lines.forEach((line, index) => {
      const netLineMinor = line.netUnitMinor * line.quantity;
      const lineDiscountMinor =
        index === lines.length - 1
          ? discountMinor - allocatedDiscountMinor
          : netSubtotalMinor > 0
            ? Math.round((discountMinor * netLineMinor) / netSubtotalMinor)
            : 0;
      allocatedDiscountMinor += lineDiscountMinor;
      const lineNetMinor = netLineMinor - lineDiscountMinor;
      discountedNetMinor += lineNetMinor;
      taxMinor += tenant.pricesIncludeTax ? Math.round(lineNetMinor * taxFraction) : 0;
    });

    const totalMinor = discountedNetMinor + taxMinor;
    const tenderedMinor = method === "cash" ? toMinor(amountMinor) : totalMinor;
    const paidMinor = Math.min(tenderedMinor, totalMinor);
    const changeDueMinor = tenderedMinor > totalMinor ? tenderedMinor - totalMinor : 0;
    const grossProfitMinor = discountedNetMinor - cogsMinor;

    return {
      netSubtotalMinor,
      discountMinor,
      taxMinor,
      totalMinor,
      tenderedMinor,
      paidMinor,
      changeDueMinor,
      grossProfitMinor,
    };
  }, [cart, method, amountMinor, tenant, discountType, discountValue]);

  function addToCart(product: PosProduct) {
    if (product.quantity <= 0) return;
    const existing = cart.find((line) => line.key === product.id);
    const nextQuantity = (existing?.quantity ?? 0) + 1;
    if (nextQuantity > product.quantity) return;
    if (existing) {
      setCart(
        cart.map((line) =>
          line.key === product.id ? { ...line, quantity: nextQuantity } : line,
        ),
      );
      return;
    }
    setCart([
      ...cart,
      {
        key: product.id,
        productId: product.productId,
        variantId: product.variantId,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: 1,
        unitCostMinor: toMinor(product.costPrice),
        unitPriceMinor: toMinor(product.sellingPrice),
      },
    ]);
  }

  function handleScan() {
    const needle = scanValue.trim().toLowerCase();
    if (!needle) return;
    const match = products.find(
      (product) =>
        (product.barcode ?? "").toLowerCase() === needle ||
        product.sku.toLowerCase() === needle,
    );
    if (!match) {
      setScanMessage(`No product matches “${scanValue.trim()}”.`);
      setScanValue("");
      return;
    }
    if (match.quantity <= 0) {
      setScanMessage(`${match.name} is out of stock at this branch.`);
      setScanValue("");
      return;
    }
    addToCart(match);
    setScanMessage(`${match.name} added.`);
    setScanValue("");
  }

  function setQuantity(key: string, quantity: number) {
    const max = products.find((product) => product.id === key)?.quantity ?? 0;
    const clamped = Math.max(0, Math.min(quantity, Math.max(max, 0)));
    setCart((current) =>
      current
        .map((line) => (line.key === key ? { ...line, quantity: clamped } : line))
        .filter((line) => line.quantity > 0),
    );
  }

  async function submit() {
    setError(undefined);
    if (cart.length === 0) {
      setError("Add products to the sale before charging.");
      return;
    }
    if (busy) return;
    setBusy(true);
    const lines = cart.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
    }));
    const outcome = await completePosSale({
      customerId: customerId || null,
      lines,
      method,
      amountPaidMinor:
        method === "cash" ? totals.tenderedMinor : totals.totalMinor,
      discountMinor: totals.discountMinor,
      notes: notes || null,
    });
    if (outcome && !outcome.ok) {
      setError(outcome.error);
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 border-b border-border/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-[15px] font-semibold">Stock at {branchName}</h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">Tap a product to add it to the sale.</p>
          </div>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, SKU or barcode…"
              aria-label="Search products"
              className="h-9 rounded-lg pl-9 text-[13px]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-border/80 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center">
          <label htmlFor="pos-scan" className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <ScanBarcode className="size-4 text-muted-foreground" aria-hidden />
            Scan barcode
          </label>
          <Input
            id="pos-scan"
            value={scanValue}
            onChange={(event) => {
              setScanValue(event.target.value);
              setScanMessage(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleScan();
              }
            }}
            placeholder="Scan or type a barcode, then press Enter"
            autoComplete="off"
            className="h-9 flex-1 rounded-lg font-mono text-[13px] sm:max-w-sm"
          />
          {scanMessage ? (
            <p className={`text-[11.5px] ${scanMessage.includes("added") ? "text-success" : "text-destructive"}`} role="status">
              {scanMessage}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-border/80 px-4 py-3">
          <button
            type="button"
            onClick={() => setCategoryId("all")}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
              categoryId === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted/60"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                categoryId === category.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="max-h-[560px] overflow-y-auto p-2 sm:p-3">
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 text-[12.5px] text-muted-foreground">
              No products match. Adjust the search or category.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={product.quantity <= 0}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-all hover:border-[#cfe0d5] hover:bg-[#fbfdf9] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-[10px] font-semibold text-muted-foreground">
                    {product.sku.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-foreground">{product.name}</span>
                    <span className="mt-0.5 block text-[10.5px] text-muted-foreground tabular">
                      {product.unit} · stock {product.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11.5px] font-medium text-foreground tabular">
                    {formatMoney(product.sellingPrice)}
                  </span>
                  <span className="shrink-0 flex size-7 items-center justify-center rounded-full bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground disabled:bg-muted disabled:text-muted-foreground">
                    <Plus className="size-3.5" aria-hidden />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="flex max-h-[640px] flex-col rounded-xl border border-border bg-card shadow-[var(--shadow-card)] lg:sticky lg:top-6 lg:max-h-none">
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3.5">
          <h2 className="font-heading text-[15px] font-semibold">Current sale</h2>
          <span className="text-[11px] font-medium text-muted-foreground tabular">{cart.length} line{cart.length === 1 ? "" : "s"}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 text-center text-[12.5px] text-muted-foreground">
              The till is empty. Tap products from the stock list.
            </div>
          ) : (
            <ol className="space-y-2.5">
              {cart.map((line) => (
                <li key={line.key} className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold">{line.name}</p>
                      <p className="mt-0.5 text-[10.5px] text-muted-foreground tabular">
                        {formatMinor(line.unitPriceMinor)} · {line.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.key, 0)}
                      aria-label={`Remove ${line.name} from sale`}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setQuantity(line.key, line.quantity - 1)}
                        aria-label={`Decrease quantity of ${line.name}`}
                        className="flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                        disabled={line.quantity <= 1}
                      >
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                      <span className="min-w-8 text-center font-mono text-[12px] font-medium tabular">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.key, line.quantity + 1)}
                        aria-label={`Increase quantity of ${line.name}`}
                        className="flex size-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                        disabled={
                          line.quantity >=
                          (products.find((product) => product.id === line.key)?.quantity ?? 0)
                        }
                      >
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </div>
                    <span className="font-mono text-[12px] font-medium tabular">
                      {formatMinor(line.unitPriceMinor * line.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="border-t border-border/80 px-4 py-3.5">
          <div className="space-y-1.5 text-[12px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono tabular">{formatMinor(totals.netSubtotalMinor)}</span>
            </div>
            {totals.discountMinor > 0 ? (
              <div className="flex items-center justify-between text-[#a4671a]">
                <span>Discount</span>
                <span className="font-mono tabular">−{formatMinor(totals.discountMinor)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Tax {tenant.pricesIncludeTax ? `(${Number(tenant.taxRate) || 0}%)` : "(excl.)"}</span>
              <span className="font-mono tabular">{formatMinor(totals.taxMinor)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/70 pt-1.5 font-heading text-[15px] font-semibold text-foreground tabular">
              <span>Total</span>
              <span>{formatMinor(totals.totalMinor)}</span>
            </div>
            {method === "cash" ? (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Amount tendered</span>
                <span className="font-mono tabular">{formatMinor(totals.tenderedMinor)}</span>
              </div>
            ) : null}
            {method === "cash" && totals.changeDueMinor > 0 ? (
              <div className="flex items-center justify-between text-success">
                <span>Change due</span>
                <span className="font-mono tabular">{formatMinor(totals.changeDueMinor)}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-3.5 space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="pos-discount" className="block text-[13px] font-medium text-foreground">
                  Discount
                </label>
                <div className="flex overflow-hidden rounded-md border border-border">
                  {(["amount", "percent"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setDiscountType(type);
                        setDiscountValue("");
                      }}
                      aria-pressed={discountType === type}
                      className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        discountType === type
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      {type === "amount" ? "Amount" : "%"}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                id="pos-discount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
                placeholder={discountType === "amount" ? "0.00" : "0"}
                className="h-9 rounded-lg text-[13px] font-mono tabular"
              />
            </div>

            <div>
              <label htmlFor="pos-customer" className="mb-1.5 block text-[13px] font-medium text-foreground">
                Customer (optional)
              </label>
              <select
                id="pos-customer"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground shadow-[0_1px_1px_rgb(16_35_27/2%)] outline-none md:text-sm"
              >
                <option value="">Walk-in customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1.5 text-[13px] font-medium text-foreground">Payment method</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {METHODS.map((item) => {
                  const Icon = item.icon;
                  const active = method === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setMethod(item.key)}
                      aria-pressed={active}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11.5px] font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <Icon className="size-3.5" aria-hidden />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {method === "cash" ? (
              <div>
                <label htmlFor="pos-tendered" className="mb-1.5 block text-[13px] font-medium text-foreground">
                  Amount tendered
                </label>
                <Input
                  id="pos-tendered"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={amountMinor}
                  onChange={(event) => setAmountMinor(event.target.value)}
                  placeholder="0.00"
                  className="h-9 rounded-lg text-[13px] font-mono tabular"
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="pos-notes" className="mb-1.5 block text-[13px] font-medium text-foreground">
                Receipt note (optional)
              </label>
              <Input
                id="pos-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g. Wholesale customer"
                maxLength={255}
                className="h-9 rounded-lg text-[13px]"
              />
            </div>
          </div>

          {error ? <div className="mt-3 rounded-lg border border-[#f1d2cf] bg-danger-soft px-3 py-2.5 text-[12.5px] font-medium text-destructive">{error}</div> : null}

          <Button type="button" onClick={submit} loading={busy} disabled={cart.length === 0} className="mt-4 h-11 w-full">
            <ReceiptText className="size-4" aria-hidden />
            Charge {formatMinor(totals.paidMinor)}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-10 w-full"
            render={<Link href="/app/sales">View sales</Link>}
            nativeButton={false}
          >
            View sales
          </Button>
        </div>
      </aside>
    </div>
  );
}
