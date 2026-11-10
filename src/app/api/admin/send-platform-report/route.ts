import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { runPlatformDailyReport } from "@/lib/services/notifications";

export async function POST() {
  await requireSuperAdmin();

  try {
    const result = await runPlatformDailyReport();
    return NextResponse.json({ ok: true, report: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Report failed to send." },
      { status: 500 },
    );
  }
}
