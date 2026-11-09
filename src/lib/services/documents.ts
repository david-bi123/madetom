import { and, eq } from "drizzle-orm";
import type { Transaction } from "@/lib/db";
import { documentSequences } from "@/lib/db/schema";

/**
 * Allocate the next human-readable document number inside the caller's
 * transaction. Row locking keeps receipts sequential under concurrent sales.
 */
export async function nextDocumentNumber(
  tx: Transaction,
  tenantId: string,
  key: string,
  prefix: string,
  digits = 5,
): Promise<string> {
  const [existing] = await tx
    .select()
    .from(documentSequences)
    .where(and(eq(documentSequences.tenantId, tenantId), eq(documentSequences.key, key)))
    .for("update");

  if (!existing) {
    await tx.insert(documentSequences).values({
      id: crypto.randomUUID(),
      tenantId,
      key,
      prefix,
      nextNumber: 2,
    });
    return `${prefix}${String(1).padStart(digits, "0")}`;
  }

  const current = existing.nextNumber;
  await tx
    .update(documentSequences)
    .set({ nextNumber: current + 1 })
    .where(eq(documentSequences.id, existing.id));

  return `${prefix}${String(current).padStart(digits, "0")}`;
}
