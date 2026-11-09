import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { requireBusiness } from "@/lib/auth/guards";
import { StaffInviteForm } from "@/components/staff/staff-invite-form";
import { Button } from "@/components/ui/button";

/** This screen reads request-time data, so it is a blocking route. */

export default async function InviteStaffPage() {
  const context = await requireBusiness("staff.manage");

  const branchRows = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(and(eq(branches.tenantId, context.tenant.id), eq(branches.status, "active")))
    .orderBy(asc(branches.createdAt));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Team</p>
          <h1 className="font-heading text-[25px] leading-[1.15] font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">
            Invite staff
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Give a manager, cashier or inventory manager their own access to {context.tenant.name}.
          </p>
        </div>
        <Button render={<a href="/app/staff" />} nativeButton={false}>
          Back to staff
        </Button>
      </div>

      <StaffInviteForm
        branches={branchRows.map((branch) => ({ id: branch.id, name: branch.name }))}
        defaultBranchId={context.activeBranch.id}
      />
    </div>
  );
}
