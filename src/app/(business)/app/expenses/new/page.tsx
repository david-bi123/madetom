import { requireBusiness } from "@/lib/auth/guards";
import { FormPageHeader } from "@/components/forms/form-page-header";
import { ExpenseForm } from "@/components/expenses/expense-form";

/** This screen reads request-time data, so it is a blocking route. */

export default async function NewExpensePage() {
  const context = await requireBusiness("expenses.manage");

  return (
    <div className="mx-auto max-w-3xl">
      <FormPageHeader
        eyebrow={context.activeBranch.name}
        title="Record an expense"
        description="Rent, transport, utilities and everything else that costs the business money."
        backHref="/app/expenses"
        backLabel="All expenses"
      />
      <ExpenseForm branchName={context.activeBranch.name} />
    </div>
  );
}
