import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  productCategories,
  productStock,
  products,
  suppliers,
} from "@/lib/db/schema";
import { findActiveWorkspace, getSession } from "@/lib/auth/session";
import { effectivePermissions } from "@/lib/permissions";

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(",");
}

const HEADER = [
  "name",
  "sku",
  "barcode",
  "category",
  "supplier",
  "description",
  "costPrice",
  "sellingPrice",
  "reorderLevel",
  "unit",
  "taxRate",
  "trackInventory",
  "status",
  "quantity",
];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You need to sign in to export products." }, { status: 401 });
  }

  const workspace = await findActiveWorkspace(session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: "No workspace is linked to this account." }, { status: 403 });
  }

  const permissions = effectivePermissions(
    workspace.membership.roleKey,
    workspace.membership.permissionsOverride,
  );
  if (!permissions.has("products.view")) {
    return NextResponse.json({ error: "Your role cannot export products." }, { status: 403 });
  }

  const url = new URL(request.url);
  const stamp = new Date().toISOString().slice(0, 10);

  if (url.searchParams.get("template") === "1") {
    const sample = [
      csvRow(HEADER),
      csvRow([
        "Coca-Cola 1.5L",
        "COKE-1500",
        "5449000000996",
        "Drinks",
        "",
        "Chilled bottle",
        "12.00",
        "18.00",
        "10",
        "bottle",
        "15",
        "true",
        "active",
        "24",
      ]),
      csvRow([
        "Sachet water",
        "WATER-SACHET",
        "",
        "Drinks",
        "",
        "",
        "0.40",
        "0.80",
        "50",
        "bag",
        "",
        "true",
        "active",
        "100",
      ]),
    ].join("\n");
    return new NextResponse(sample, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="madetom-products-template.csv"`,
      },
    });
  }

  const branchRows = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.tenantId, workspace.tenant.id), eq(branches.status, "active")))
    .orderBy(asc(branches.createdAt));
  const branchId =
    branchRows.find((branch) => branch.id === workspace.membership.defaultBranchId)?.id ??
    branchRows[0]?.id ??
    null;

  const rows = await db
    .select({
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      category: productCategories.name,
      supplier: suppliers.name,
      description: products.description,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      reorderLevel: products.reorderLevel,
      unit: products.unit,
      taxRate: products.taxRate,
      trackInventory: products.trackInventory,
      status: products.status,
      quantity: productStock.quantity,
    })
    .from(products)
    .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
    .leftJoin(suppliers, eq(suppliers.id, products.supplierId))
    .leftJoin(
      productStock,
      and(
        eq(productStock.productId, products.id),
        eq(productStock.tenantId, workspace.tenant.id),
        branchId ? eq(productStock.branchId, branchId) : undefined,
      ),
    )
    .where(eq(products.tenantId, workspace.tenant.id))
    .orderBy(asc(products.name));

  const body = [
    csvRow(HEADER),
    ...rows.map((row) =>
      csvRow([
        row.name,
        row.sku,
        row.barcode,
        row.category,
        row.supplier,
        row.description,
        row.costPrice,
        row.sellingPrice,
        row.reorderLevel,
        row.unit,
        row.taxRate,
        row.trackInventory ? "true" : "false",
        row.status,
        row.quantity ?? 0,
      ]),
    ),
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="madetom-products-${stamp}.csv"`,
    },
  });
}
