import { requireBusiness } from "@/lib/auth/guards";
import { FormPageHeader } from "@/components/forms/form-page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";

/** This screen reads request-time data, so it is a blocking route. */

export default async function NewSupplierPage() {
  await requireBusiness("suppliers.manage");

  return (
    <div className="mx-auto max-w-3xl">
      <FormPageHeader
        eyebrow="Suppliers"
        title="Add a supplier"
        description="Keep the people and companies you buy stock from, with their contact details."
        backHref="/app/suppliers"
        backLabel="All suppliers"
      />
      <SupplierForm />
    </div>
  );
}
