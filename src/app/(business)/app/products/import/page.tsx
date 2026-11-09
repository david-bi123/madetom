import Link from "next/link";
import { requireBusiness } from "@/lib/auth/guards";
import { ProductImportForm } from "@/components/products/product-import-form";
import { Button } from "@/components/ui/button";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export default async function ImportProductsPage() {
  await requireBusiness("products.manage");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Catalogue</p>
          <h1 className="font-heading text-[25px] leading-[1.15] font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">
            Import products
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">Bulk-load your catalogue from a CSV file.</p>
        </div>
        <Button variant="outline" render={<Link href="/app/products" />} nativeButton={false}>
          Back to products
        </Button>
      </div>

      <ProductImportForm />
    </div>
  );
}
