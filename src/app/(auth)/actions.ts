"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
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
import { normalizePhone } from "@/lib/format";
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
    login: formString(formData, "login"),
    password: formString(formData, "password"),
  });
  if (!parsed.success) return zodState(parsed.error);

  const login = parsed.data.login.toLowerCase();
  const password = parsed.data.password;
  const ip = await requestIp();

  const isPhone = login.includes("+") || /^\d/.test(login.replace(/\s/g, ""));
  const normalizedPhone = isPhone ? normalizePhone(login) : null;

  const rateLimitKey = isPhone ? `login:${ip}:phone:${normalizedPhone}` : `login:${ip}:email:${login}`;
  const limit = await consumeRateLimit(rateLimitKey, 8, 15 * 60);
  if (!limit.allowed) {
    return { error: "Too many sign-in attempts. Wait 15 minutes and try again." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(
      isPhone && normalizedPhone
        ? and(eq(users.phone, normalizedPhone), isNull(users.email))
        : eq(users.email, login),
    )
    .limit(1);

  // Fallback: try matching by phone if email lookup failed. One phone number
  // can belong to more than one account (for example a platform administrator
  // who also owns a shop), so a business account always wins over a super
  // admin, and the oldest account wins after that.
  const userToVerify = user ?? (isPhone && normalizedPhone
    ? await db
        .select()
        .from(users)
        .where(eq(users.phone, normalizedPhone))
        .orderBy(asc(users.isSuperAdmin), asc(users.createdAt))
        .limit(1)
        .then((r) => r[0])
    : null);

  const passwordValid = await verifyPassword(password, userToVerify?.passwordHash ?? DUMMY_HASH);

  if (!userToVerify || !userToVerify.passwordHash || !passwordValid) {
    return { error: "The email, phone or password is incorrect." };
  }
  if (userToVerify.status !== "active") {
    return { error: "This account is not active. Contact your Madetom administrator." };
  }

  if (userToVerify.isSuperAdmin) {
    await clearRateLimit(rateLimitKey);
    await createSession(userToVerify.id);
    await writeAudit({
      actorUserId: userToVerify.id,
      actorName: userToVerify.name,
      action: "auth.login",
      entityType: "user",
      entityId: userToVerify.id,
      summary: "Signed in to the platform console",
    });
    redirect("/admin");
  }

  const [membership] = await db
    .select({ membership: tenantMemberships, tenant: tenants })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(and(eq(tenantMemberships.userId, userToVerify.id), eq(tenantMemberships.status, "active")))
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
  if (membership.tenant.status === "pending" && !membership.tenant.paymentExempt) {
    await clearRateLimit(rateLimitKey);
    await createSession(userToVerify.id);
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userToVerify.id));
    await writeAudit({
      tenantId: membership.tenant.id,
      actorUserId: userToVerify.id,
      actorName: userToVerify.name,
      action: "auth.login",
      entityType: "user",
      entityId: userToVerify.id,
      summary: "Signed in to complete the workspace payment",
    });
    redirect("/pending-payment");
  }
  if (!membership.tenant.onboardingCompletedAt) {
    return {
      error: "Business setup is not complete. Open the secure invitation link sent to the owner.",
    };
  }

  await clearRateLimit(rateLimitKey);
  await createSession(userToVerify.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userToVerify.id));
  await writeAudit({
    tenantId: membership.tenant.id,
    actorUserId: userToVerify.id,
    actorName: userToVerify.name,
    action: "auth.login",
    entityType: "user",
    entityId: userToVerify.id,
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
