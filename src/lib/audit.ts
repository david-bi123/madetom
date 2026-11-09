import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

type AuditInput = {
  tenantId?: string | null;
  actorUserId?: string | null;
  actorName: string;
  action: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    const requestHeaders = await headers();
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId ?? null,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      metadata: input.metadata,
      ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: requestHeaders.get("user-agent")?.slice(0, 255) ?? null,
    });
  } catch (error) {
    // Audit failures must not break the user's operation, but should be visible server-side.
    console.error("audit_log_failed", error);
  }
}

export async function getClientMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const requestHeaders = await headers();
  return {
    ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: requestHeaders.get("user-agent")?.slice(0, 255) ?? null,
  };
}
