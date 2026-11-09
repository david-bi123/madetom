import { NextResponse } from "next/server";
import { runDailySummaries } from "@/lib/services/notifications";

/**
 * Daily trading summary. Intended to be triggered by Vercel Cron (or any
 * scheduler) with `Authorization: Bearer $CRON_SECRET`.
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

  const result = await runDailySummaries();

  return NextResponse.json({
    ok: true,
    workspaces: result.tenants,
    notificationsCreated: result.notified,
  });
}
