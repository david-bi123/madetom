"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  passwordResetTokens,
  tenantMemberships,
  tenants,
  users,
} from "@/lib/db/schema";
import {
  createResetCode,
  createSession,
  destroySession,
  findActiveWorkspace,
  hashPassword,
  hashResetCode,
  revokeAllSessions,
  verifyPassword,
} from "@/lib/auth/session";
import { consumeRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";
import { sendSms } from "@/lib/services/sms";
import { zodState, type ActionState, formString } from "@/lib/action-state";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { isValidPhone } from "@/lib/format";

const DUMMY_HASH = "$2b$12$V4ww0H/zo3eRVbz8ywzNIOLDGG6qsbPJQHKPGt3dfqajZRHwMpw6W";

async function requestIp(): Promise<string> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function loginAction(formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });
  if (!parsed.success) return zodState(parsed.error);

  const email = parsed.data.email.toLowerCase();
  const ip = await requestIp();
  const limit = await consumeRateLimit(`login:${ip}:${email}`, 8, 15 * 60);
  if (!limit.allowed) {
    return { error: "Too many sign-in attempts. Wait 15 minutes and try again." };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const passwordValid = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.passwordHash || !passwordValid) {
    return { error: "The email or password is incorrect." };
  }
  if (user.status !== "active") {
    return { error: "This account is not active. Contact your Madetom administrator." };
  }

  if (user.isSuperAdmin) {
    await clearRateLimit(`login:${ip}:${email}`);
    await createSession(user.id);
    await writeAudit({
      actorUserId: user.id,
      actorName: user.name,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      summary: "Signed in to the platform console",
    });
    redirect("/admin");
  }

  const [membership] = await db
    .select({ membership: tenantMemberships, tenant: tenants })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(and(eq(tenantMemberships.userId, user.id), eq(tenantMemberships.status, "active")))
    .limit(1);

  if (!membership) {
    return {
      error: "No active business workspace is linked to this account. Contact your administrator.",
    };
  }
  if (membership.tenant.status === "suspended") {
    return {
      error: "This business account is suspended. Contact Madetom support to restore access.",
    };
  }
  if (!membership.tenant.onboardingCompletedAt) {
    return {
      error: "Business setup is not complete. Open the secure invitation link sent to the owner.",
    };
  }

  await clearRateLimit(`login:${ip}:${email}`);
  await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await writeAudit({
    tenantId: membership.tenant.id,
    actorUserId: user.id,
    actorName: user.name,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
    summary: "Signed in to the business workspace",
  });

  redirect("/app");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formString(formData, "email"),
  });
  if (!parsed.success) return zodState(parsed.error);

  const email = parsed.data.email.toLowerCase();
  const ip = await requestIp();
  const limit = await consumeRateLimit(`reset-request:${ip}:${email}`, 4, 15 * 60);
  if (!limit.allowed) {
    return { error: "Too many reset requests. Wait 15 minutes before trying again." };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (user && user.status === "active" && user.phone && isValidPhone(user.phone)) {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

    const code = createResetCode();
    await db.insert(passwordResetTokens).values({
      id: crypto.randomUUID(),
      userId: user.id,
      codeHash: hashResetCode(code),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const fakeTenant = await findActiveWorkspace(user.id);
    await sendSms({
      tenantId: null,
      phone: user.phone,
      message: `Madetom: your password reset code is ${code}. It expires in 15 minutes. If you did not request this, ignore this message.`,
      displayMessage:
        "Madetom: your password reset code is [hidden]. It expires in 15 minutes. If you did not request this, ignore this message.",
      purpose: "password_reset",
      relatedType: "user",
      relatedId: user.id,
      deductCredit: false,
    });

    await writeAudit({
      tenantId: fakeTenant?.tenant.id ?? null,
      actorUserId: user.id,
      actorName: user.name,
      action: "auth.password_reset_requested",
      entityType: "user",
      entityId: user.id,
      summary: "Requested a password reset code by SMS",
    });
  }

  redirect(`/reset-password?email=${encodeURIComponent(email)}&sent=1`);
}

export async function resetPasswordAction(formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    email: formString(formData, "email"),
    code: formString(formData, "code"),
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });
  if (!parsed.success) return zodState(parsed.error);

  const email = parsed.data.email.toLowerCase();
  const ip = await requestIp();
  const limit = await consumeRateLimit(`reset-verify:${ip}:${email}`, 10, 15 * 60);
  if (!limit.allowed) {
    return { error: "Too many attempts. Wait 15 minutes and request a new code." };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const [token] = user
    ? await db
        .select()
        .from(passwordResetTokens)
        .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)))
        .orderBy(desc(passwordResetTokens.createdAt))
        .limit(1)
    : [];

  if (!user || !token || token.expiresAt < new Date() || token.attempts >= 5) {
    return { error: "That code is invalid or has expired. Request a new one." };
  }

  if (token.codeHash !== hashResetCode(parsed.data.code)) {
    await db
      .update(passwordResetTokens)
      .set({ attempts: token.attempts + 1 })
      .where(eq(passwordResetTokens.id, token.id));
    return { error: "That code is invalid or has expired. Request a new one." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, user.id));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, token.id));
    await tx
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
  });
  await revokeAllSessions(user.id);
  await writeAudit({
    actorUserId: user.id,
    actorName: user.name,
    action: "auth.password_reset_completed",
    entityType: "user",
    entityId: user.id,
    summary: "Reset account password via SMS verification",
  });

  redirect("/login?reset=1");
}
