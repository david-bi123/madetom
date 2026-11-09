"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/format";
import { formString, type ActionState, zodState } from "@/lib/action-state";
import { passwordSchema } from "@/lib/validation/auth";
import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .max(30, "Phone number is too long.");

async function requestIp(): Promise<string> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function setupSuperAdmin(formData: FormData): Promise<ActionState> {
  const ip = await requestIp();
  const limit = await consumeRateLimit(`superadmin-setup:${ip}`, 10, 15 * 60);
  if (!limit.allowed) {
    return { error: "Too many setup attempts. Wait 15 minutes and try again." };
  }

  const [existingSuperAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isSuperAdmin, true))
    .limit(1);
  if (existingSuperAdmin) {
    return { error: "A super admin already exists. Sign in instead." };
  }

  const base = {
    name: formString(formData, "name"),
    email: formString(formData, "email").toLowerCase(),
    phone: formString(formData, "phone"),
    password: formString(formData, "password", false),
    confirmPassword: formString(formData, "confirmPassword", false),
  };

  const parsed = z
    .object({
      name: z.string().trim().min(2, "Enter your full name.").max(120),
      email: z.string().trim().email("Enter a valid email address."),
      phone: phoneSchema.refine((v) => {
        const normalized = normalizePhone(v);
        return /^\+\d{9,15}$/.test(normalized);
      }, "Enter a valid phone number, e.g. 055 062 4203."),
      password: passwordSchema,
      confirmPassword: z.string().min(1, "Confirm your password."),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    })
    .safeParse(base);

  if (!parsed.success) return zodState(parsed.error);
  const data = parsed.data;

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);
  if (existingUser) {
    return { error: "An account with this email already exists. Sign in instead." };
  }

  const { hashPassword } = await import("@/lib/auth/session");
  const passwordHash = await hashPassword(data.password);
  const userId = crypto.randomUUID();

  try {
    await db.insert(users).values({
      id: userId,
      name: data.name,
      email: data.email,
      phone: normalizePhone(data.phone),
      passwordHash,
      isSuperAdmin: true,
      status: "active",
    });
  } catch (error) {
    console.error("superadmin_setup_failed", error);
    return { error: "We could not create the super admin account. Please try again." };
  }

  await createSession(userId);
  await writeAudit({
    actorUserId: userId,
    actorName: data.name,
    action: "auth.superadmin_created",
    entityType: "user",
    entityId: userId,
    summary: "First super admin account created via setup link.",
  });

  redirect("/admin");
}
