import { NextResponse } from "next/server";
import { rgb } from "pdf-lib";
import { and, desc, eq, sql } from "drizzle-orm";
import { startOfDay, subDays, endOfDay } from "date-fns";
import { db } from "@/lib/db";
import {
  branches,
  customers,
  expenses,
  saleItems,
  sales,
  users,
} from "@/lib/db/schema";
import { getSession, findActiveWorkspace } from "@/lib/auth/session";
import { effectivePermissions } from "@/lib/permissions";
import { toMinor } from "@/lib/format";
import { PdfBuilder, formatMoneyPlain } from "@/lib/reports/pdf";

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(",");
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You need to sign in to export reports." }, { status: 401 });
  }

  const workspace = await findActiveWorkspace(session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: "No workspace is linked to this account." }, { status: 403 });
  }

  const permissions = effectivePermissions(
    workspace.membership.roleKey,
    workspace.membership.permissionsOverride,
  );
  if (!permissions.has("reports.export")) {
    return NextResponse.json({ error: "Your role cannot export reports." }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedBranchId = url.searchParams.get("branchId");
  const tenantBranches = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.tenantId, workspace.tenant.id));
  const branch =
    requestedBranchId
      ? tenantBranches.find((item) => item.id === requestedBranchId)
      : undefined;
  const branchId = branch?.id ?? null;

  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? "30") || 30, 1), 365);
  const rangeStart = startOfDay(subDays(new Date(), days - 1));
  const rangeEnd = endOfDay(new Date());

  const rows = await db
    .select({
      receiptNumber: sales.receiptNumber,
      createdAt: sales.createdAt,
      status: sales.status,
      customerName: customers.name,
      cashierName: users.name,
      subtotal: sales.subtotal,
      taxAmount: sales.taxAmount,
      discountAmount: sales.discountAmount,
      total: sales.total,
      amountPaid: sales.amountPaid,
      paymentStatus: sales.paymentStatus,
    })
    .from(sales)
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .leftJoin(users, eq(users.id, sales.cashierId))
    .where(
      and(
        eq(sales.tenantId, workspace.tenant.id),
        branchId ? eq(sales.branchId, branchId) : undefined,
        sql`${sales.createdAt} >= ${rangeStart}`,
        sql`${sales.createdAt} <= ${rangeEnd}`,
      ),
    )
    .orderBy(desc(sales.createdAt))
    .limit(2000);

  const stamp = new Date().toISOString().slice(0, 10);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();

  if (format === "pdf") {
    const [costRows, expenseRows] = await Promise.all([
      db
        .select({
          cogs: sql<string>`coalesce(sum(${saleItems.unitCost} * ${saleItems.quantity}), 0)`,
        })
        .from(sales)
        .leftJoin(
          saleItems,
          and(eq(saleItems.saleId, sales.id), eq(saleItems.tenantId, workspace.tenant.id)),
        )
        .where(
          and(
            eq(sales.tenantId, workspace.tenant.id),
            branchId ? eq(sales.branchId, branchId) : undefined,
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${rangeStart}`,
            sql`${sales.createdAt} <= ${rangeEnd}`,
          ),
        ),
      db
        .select({
          expenses: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.tenantId, workspace.tenant.id),
            branchId ? eq(expenses.branchId, branchId) : undefined,
            sql`${expenses.expenseDate} >= ${rangeStart.toISOString().slice(0, 10)}`,
            sql`${expenses.expenseDate} <= ${rangeEnd.toISOString().slice(0, 10)}`,
          ),
        ),
    ]);

    const completed = rows.filter((row) => row.status === "completed");
    const netRevenueMinor = completed.reduce(
      (sum, row) => sum + toMinor(row.total) - toMinor(row.taxAmount),
      0,
    );
    const taxMinor = completed.reduce((sum, row) => sum + toMinor(row.taxAmount), 0);
    const grossMinor = completed.reduce((sum, row) => sum + toMinor(row.total), 0);
    const cogsMinor = Math.round(Number(costRows[0]?.cogs ?? 0) * 100);
    const expenseMinor = Math.round(Number(expenseRows[0]?.expenses ?? 0) * 100);
    const profitMinor = netRevenueMinor - cogsMinor - expenseMinor;

    const pdf = await PdfBuilder.create();
    pdf.text(workspace.tenant.name, { size: 16, bold: true, gap: 18 });
    pdf.text("Sales and profit report", { size: 10, color: rgb(0.42, 0.47, 0.44), gap: 14 });
    pdf.rule();

    pdf.keyValues([
      { label: "Branch", value: branch?.name ?? "All branches" },
      {
        label: "Period",
        value: `${rangeStart.toISOString().slice(0, 10)} to ${rangeEnd.toISOString().slice(0, 10)}`,
      },
      { label: "Generated", value: new Date().toISOString().replace("T", " ").slice(0, 16) },
      { label: "Generated by", value: session.user.name },
    ]);

    pdf.heading("Summary");
    pdf.keyValues([
      { label: "Transactions (completed)", value: String(completed.length) },
      { label: "Gross sales", value: formatMoneyPlain(grossMinor, workspace.tenant.currency) },
      { label: "Tax collected", value: formatMoneyPlain(taxMinor, workspace.tenant.currency) },
      { label: "Net revenue", value: formatMoneyPlain(netRevenueMinor, workspace.tenant.currency) },
      { label: "Cost of goods sold", value: formatMoneyPlain(cogsMinor, workspace.tenant.currency) },
      { label: "Expenses", value: formatMoneyPlain(expenseMinor, workspace.tenant.currency) },
      { label: "Gross profit after expenses", value: formatMoneyPlain(profitMinor, workspace.tenant.currency) },
    ]);

    pdf.heading("Sales detail");
    pdf.table(
      [
        { label: "Receipt", width: 78 },
        { label: "Date", width: 120 },
        { label: "Customer", width: 140 },
        { label: "Cashier", width: 100 },
        { label: "Total", width: 73, align: "right" },
      ],
      rows.map((row) => [
        { text: row.receiptNumber },
        { text: row.createdAt.toISOString().slice(0, 16).replace("T", " ") },
        { text: row.customerName ?? "Walk-in customer" },
        { text: row.cashierName ?? "" },
        { text: formatMoneyPlain(toMinor(row.total), workspace.tenant.currency), align: "right" },
      ]),
    );

    pdf.footer(
      "Generated by Madetom. Net revenue excludes tax and discounts. Refunded sales are excluded from the summary.",
    );

    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="madetom-sales-${stamp}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const header = csvRow([
    "Receipt",
    "Date",
    "Status",
    "Customer",
    "Cashier",
    "Subtotal",
    "Discount",
    "Tax",
    "Total",
    "Amount paid",
    "Payment status",
  ]);

  const body = rows.map((row) =>
    csvRow([
      row.receiptNumber,
      row.createdAt.toISOString(),
      row.status,
      row.customerName ?? "Walk-in customer",
      row.cashierName ?? "",
      (toMinor(row.subtotal) / 100).toFixed(2),
      (toMinor(row.discountAmount) / 100).toFixed(2),
      (toMinor(row.taxAmount) / 100).toFixed(2),
      (toMinor(row.total) / 100).toFixed(2),
      (toMinor(row.amountPaid) / 100).toFixed(2),
      row.paymentStatus,
    ]),
  );

  const csv = [header, ...body].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="madetom-sales-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
