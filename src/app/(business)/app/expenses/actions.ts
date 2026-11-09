"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { fromMinor, parseMoneyInput } from "@/lib/format";
import { formString, zodState, type ActionState } from "@/lib/action-state";
import { expenseSchema } from "@/lib/validation/expense";

export async function createExpense(state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireBusiness("expenses.manage");

  const parsed = expenseSchema.safeParse({
    category: formString(formData, "category"),
    description: formString(formData, "description"),
    amount: formString(formData, "amount"),
    expenseDate: formString(formData, "expenseDate"),
    paymentMethod: formString(formData, "paymentMethod"),
    reference: formString(formData, "reference"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const values = parsed.data;

  const amountMinor = parseMoneyInput(values.amount);
  if (amountMinor <= 0) return { error: "Enter an amount above zero." };

  const expenseId = crypto.randomUUID();
  await db.insert(expenses).values({
    id: expenseId,
    tenantId: context.tenant.id,
    branchId: context.activeBranch.id,
    category: values.category,
    description: values.description,
    amount: fromMinor(amountMinor),
    expenseDate: values.expenseDate,
    paymentMethod: values.paymentMethod,
    reference: values.reference || null,
    createdBy: context.user.id,
  });

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "expense.created",
    entityType: "expense",
    entityId: expenseId,
    summary: `Recorded ${values.category} expense of ${fromMinor(amountMinor)}`,
  });

  revalidatePath("/app/expenses");
  revalidatePath("/app/reports");
  redirect("/app/expenses?created=1");
}
