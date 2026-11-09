import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { and, eq, gt, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sessions, tenantMemberships, tenants, users } from "@/lib/db/schema";
import type { User } from "@/lib/db/schema";

export const SESSION_COOKIE = "madetom_session";
const SESSION_DAYS = 30;

function pepper(): string {
  return process.env.TOKEN_PEPPER ?? process.env.AUTH_SECRET ?? "madetom-local-dev-pepper";
}

export function hashToken(token: string): string {
  return createHash("sha256").update(`${token}.${pepper()}`).digest("hex");
}

export function createSecureToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createResetCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashResetCode(code: string): string {
  return createHash("sha256").update(`${code}.reset.${pepper()}`).digest("hex");
}

export function constantCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = createSecureToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const requestHeaders = await headers();

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: requestHeaders.get("user-agent")?.slice(0, 255) ?? null,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  store.delete(SESSION_COOKIE);
}

export const getSession = cache(async (): Promise<{ user: User; sessionId: string } | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ user: users, sessionId: sessions.id })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        // The expiry check runs in the database so the comparison never reads
        // the wall clock during render.
        gt(sessions.expiresAt, sql`UTC_TIMESTAMP()`),
      ),
    )
    .limit(1);

  if (!row || row.user.status !== "active") return null;
  return { user: row.user, sessionId: row.sessionId };
});

export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Lightweight membership lookup used for post-login routing. */
export async function findActiveWorkspace(userId: string) {
  const [row] = await db
    .select({ membership: tenantMemberships, tenant: tenants })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(and(eq(tenantMemberships.userId, userId), eq(tenantMemberships.status, "active")))
    .limit(1);
  return row ?? null;
}
