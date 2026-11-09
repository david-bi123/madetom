"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productCategories, productStock, products, stockMovements, suppliers } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { fromMinor, toMinor } from "@/lib/format";
import { formString, successState, type ActionState } from "@/lib/action-state";

/** Minimal RFC 4180-style parser: handles quoted cells, commas, and newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => value.trim().length > 0));
}

function normaliseHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function money(value: string): string {
  return fromMinor(toMinor(value.trim()));
}

export async function importProducts(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("products.manage");
  const csv = formString(formData, "csv", false);
  if (!csv.trim()) return { error: "Paste CSV content or choose a CSV file first." };

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return { error: "The file needs a header row and at least one product row." };
  }
  if (rows.length > 501) {
    return { error: "Import at most 500 products at a time." };
  }

  const header = rows[0].map(normaliseHeader);
  const requiredColumns = ["name", "sku"];
  const missing = requiredColumns.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    return { error: `The CSV is missing required column(s): ${missing.join(", ")}.` };
  }

  const column = (cells: string[], key: string): string => {
    const index = header.indexOf(key);
    return index >= 0 ? (cells[index] ?? "").trim() : "";
  };

  const tenantId = context.tenant.id;
  const branchId = context.activeBranch.id;

  const [existingProducts, categoryRows, supplierRows] = await Promise.all([
    db
      .select({ id: products.id, sku: products.sku })
      .from(products)
      .where(eq(products.tenantId, tenantId)),
    db
      .select({ id: productCategories.id, name: productCategories.name })
      .from(productCategories)
      .where(eq(productCategories.tenantId, tenantId)),
    db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId)),
  ]);

  const productBySku = new Map(existingProducts.map((row) => [row.sku.toLowerCase(), row.id]));
  const categoryByName = new Map(categoryRows.map((row) => [row.name.toLowerCase(), row.id]));
  const supplierByName = new Map(supplierRows.map((row) => [row.name.toLowerCase(), row.id]));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const problems: string[] = [];
  const seenSkus = new Set<string>();

  await db.transaction(async (tx) => {
    for (let index = 1; index < rows.length; index++) {
      const cells = rows[index];
      const name = column(cells, "name");
      const sku = column(cells, "sku");
      const rowNumber = index + 1;

      if (!name || !sku) {
        skipped++;
        if (problems.length < 5) problems.push(`Row ${rowNumber}: name and SKU are required.`);
        continue;
      }
      const skuKey = sku.toLowerCase();
      if (seenSkus.has(skuKey)) {
        skipped++;
        if (problems.length < 5) problems.push(`Row ${rowNumber}: SKU ${sku} appears twice in the file.`);
        continue;
      }
      seenSkus.add(skuKey);

      let categoryId: string | null = null;
      const categoryName = column(cells, "category");
      if (categoryName) {
        categoryId = categoryByName.get(categoryName.toLowerCase()) ?? null;
        if (!categoryId) {
          categoryId = crypto.randomUUID();
          await tx.insert(productCategories).values({ id: categoryId, tenantId, name: categoryName });
          categoryByName.set(categoryName.toLowerCase(), categoryId);
        }
      }

      let supplierId: string | null = null;
      const supplierName = column(cells, "supplier");
      if (supplierName) {
        supplierId = supplierByName.get(supplierName.toLowerCase()) ?? null;
        if (!supplierId) {
          supplierId = crypto.randomUUID();
          await tx.insert(suppliers).values({ id: supplierId, tenantId, name: supplierName, status: "active" });
          supplierByName.set(supplierName.toLowerCase(), supplierId);
        }
      }

      const trackInventory = column(cells, "trackinventory").toLowerCase() !== "false";
      const statusValue: "active" | "archived" =
        column(cells, "status").toLowerCase() === "archived" ? "archived" : "active";
      const taxRateValue = column(cells, "taxrate");
      const reorderValue = Number(column(cells, "reorderlevel")) || 0;

      const values = {
        name,
        barcode: column(cells, "barcode") || null,
        categoryId,
        supplierId,
        description: column(cells, "description") || null,
        costPrice: money(column(cells, "costprice") || "0"),
        sellingPrice: money(column(cells, "sellingprice") || "0"),
        reorderLevel: Math.max(0, Math.round(reorderValue)),
        unit: column(cells, "unit") || "piece",
        taxRate: taxRateValue || null,
        trackInventory,
        status: statusValue,
      };

      const existingId = productBySku.get(skuKey);
      if (existingId) {
        await tx.update(products).set(values).where(and(eq(products.id, existingId), eq(products.tenantId, tenantId)));
        updated++;
        continue;
      }

      const productId = crypto.randomUUID();
      await tx.insert(products).values({ id: productId, tenantId, sku, ...values });
      productBySku.set(skuKey, productId);
      created++;

      const openingQuantity = Math.max(0, Math.round(Number(column(cells, "quantity")) || 0));
      if (trackInventory && statusValue === "active") {
        await tx.insert(productStock).values({
          id: crypto.randomUUID(),
          tenantId,
          productId,
          branchId,
          quantity: openingQuantity,
          reorderLevel: Math.max(0, Math.round(reorderValue)),
        });
        if (openingQuantity > 0) {
          await tx.insert(stockMovements).values({
            id: crypto.randomUUID(),
            tenantId,
            branchId,
            productId,
            variantId: null,
            type: "import",
            quantityDelta: openingQuantity,
            balanceAfter: openingQuantity,
            referenceType: "product_import",
            referenceLabel: "CSV import",
            note: "Opening stock from product import",
            createdBy: context.user.id,
          });
        }
      }
    }
  });

  await writeAudit({
    tenantId,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "product.imported",
    entityType: "product",
    entityId: tenantId,
    summary: `Imported products: ${created} created, ${updated} updated, ${skipped} skipped`,
  });

  revalidatePath("/app/products");
  revalidatePath("/app/inventory");
  revalidatePath("/app");

  const summary = `${created} created, ${updated} updated, ${skipped} skipped.`;
  return successState(
    problems.length > 0 ? `Import finished — ${summary} ${problems.join(" ")}` : `Import finished — ${summary}`,
    { created, updated, skipped },
  );
}
