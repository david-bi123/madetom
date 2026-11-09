import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantMemberships, tenants } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default async function SuspendedPage() {
  const session = await getSession();

  let tenantName: string | null = null;
  let reason: string | null = null;

  if (session) {
    const [row] = await db
      .select({ name: tenants.name, suspendedReason: tenants.suspendedReason })
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
      .where(
        and(
          eq(tenantMemberships.userId, session.user.id),
          eq(tenantMemberships.status, "active"),
        ),
      )
      .orderBy(asc(tenantMemberships.joinedAt))
      .limit(1);
    tenantName = row?.name ?? null;
    reason = row?.suspendedReason ?? null;
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 items-center px-5 sm:px-8">
        <Link href="/" aria-label="Madetom home" className="rounded-md">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-lg text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-destructive">
            <ShieldAlert className="size-6" aria-hidden />
          </span>
          <h1 className="mt-6 font-heading text-[28px] leading-[1.15] font-semibold tracking-[-0.035em] text-ink sm:text-[32px]">
            This workspace is paused
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            {tenantName
              ? `${tenantName} has been suspended, so the till and dashboard are unavailable for now.`
              : "Your workspace has been suspended, so the till and dashboard are unavailable for now."}
          </p>

          {reason ? (
            <div className="mt-5 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-[var(--shadow-card)]">
              <p className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Reason
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground">{reason}</p>
            </div>
          ) : null}

          <p className="mt-5 text-[12.5px] leading-relaxed text-muted-foreground">
            Your records, stock and reports are safe. Contact SamTech Labs to restore access —
            replies usually land within one business day.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" render={<a href="mailto:support@madetom.app" />} nativeButton={false}>
              Email support
            </Button>
            {session ? (
              <form action={logoutAction}>
                <Button type="submit" variant="ghost">
                  Sign out
                </Button>
              </form>
            ) : (
              <Button render={<Link href="/login" />} nativeButton={false}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
