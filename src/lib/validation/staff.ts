import { z } from "zod";
import { emailSchema, phoneSchema } from "./auth";

export const STAFF_ROLES = ["manager", "cashier", "inventory_manager"] as const;

export type StaffRoleKey = (typeof STAFF_ROLES)[number];

export const staffInviteSchema = z.object({
  name: z.string().trim().min(2, "Enter the staff member's full name.").max(120),
  phone: phoneSchema,
  email: emailSchema.nullable(),
  roleKey: z.enum(STAFF_ROLES),
  branchId: z.string().trim().min(1, "Choose the branch they will work at.").max(36),
});

export type StaffInviteValues = z.infer<typeof staffInviteSchema>;
