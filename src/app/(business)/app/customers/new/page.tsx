import { requireBusiness } from "@/lib/auth/guards";
import { FormPageHeader } from "@/components/forms/form-page-header";
import { CustomerForm } from "@/components/customers/customer-form";

/** This screen reads request-time data, so it is a blocking route. */

export default async function NewCustomerPage() {
  await requireBusiness("customers.manage");

  return (
    <div className="mx-auto max-w-3xl">
      <FormPageHeader
        eyebrow="Customers"
        title="Add a customer"
        description="Keep the people who buy from you, so you can see who they are and what they spend."
        backHref="/app/customers"
        backLabel="All customers"
      />
      <CustomerForm />
    </div>
  );
}
