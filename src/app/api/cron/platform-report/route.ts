import { NextResponse } from "next/server";
import { runPlatformDailyReport } from "@/lib/services/notifications";

/**
 * Daily platform health report sent to the super admin via SMS.
 * Intended to be triggered by Vercel Cron with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured, so scheduled jobs are disabled." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await runPlatformDailyReport();

  return NextResponse.json({
    ok: true,
    date: new Date().toISOString().slice(0, 10),
    totalWorkspaces: result.tenants,
    activeWorkspaces: result.activeTenants,
    smsSentToday: result.smsSentToday,
    smsFailedToday: result.smsFailedToday,
    superAdminNotified: result.superAdminNotified,
  });
}
