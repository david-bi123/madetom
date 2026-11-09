"use server";

import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { BRANCH_COOKIE, getBusinessContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";

export type BranchSwitchResult = { ok: boolean; error?: string };

export async function switchBranchAction(branchId: string): Promise<BranchSwitchResult> {
  const context = await getBusinessContext();
  const branch = context.branches.find((item) => item.id === branchId);
  if (!branch) return { ok: false, error: "You don't have access to that branch." };

  const store = await cookies();
  store.set(BRANCH_COOKIE, branch.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });

  await writeAudit({
    tenantId: context.tenant.id,
    actorUserId: context.user.id,
    actorName: context.user.name,
    action: "branch.switch",
    entityType: "branch",
    entityId: branch.id,
    summary: `Switched active branch to ${branch.name}`,
  });

  return { ok: true };
}

/** Re-check a branch belongs to the tenant before any server-side write. */
export async function assertBranchInTenant(tenantId: string, branchId: string) {
  const [branch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)))
    .limit(1);
  return branch ?? null;
}
