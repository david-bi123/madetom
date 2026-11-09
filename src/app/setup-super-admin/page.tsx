import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { SetupSuperAdminForm } from "./super-admin-form";

export const metadata: Metadata = {
  title: "Set up super admin",
  description: "Create the first Madetom super admin account.",
  robots: { index: false, follow: false },
};

export default async function SetupSuperAdminPage() {
  const [existingSuperAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isSuperAdmin, true))
    .limit(1);
  if (existingSuperAdmin) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="page-container flex h-[64px] items-center justify-between">
          <a href="/" aria-label="Madetom home">
            <span className="font-heading text-xl font-semibold text-ink tracking-tight">Madetom</span>
          </a>
        </div>
      </header>

      <main className="px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="page-container max-w-md mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-heading text-[30px] leading-[1.1] font-semibold tracking-[-0.035em] text-ink">
              Set up super admin
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Create the first platform super admin account. This account can add organisations and
              manage the Madetom system.
            </p>
          </div>

          <SetupSuperAdminForm />
        </div>
      </main>
    </div>
  );
}
