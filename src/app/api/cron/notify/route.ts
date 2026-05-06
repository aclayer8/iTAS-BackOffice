// =============================================================
// iTAS BackOffice — Cron Notification Job
// POST /api/cron/notify
// Called daily by cron (internal) or manually by admin
// Protect with CRON_SECRET header for external cron services
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { runExpiryNotificationJob } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  // Validate cron secret (for external cron services like Vercel Cron, Upstash)
  const authHeader = req.headers.get("authorization");
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

  if (process.env.NODE_ENV === "production" && authHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runExpiryNotificationJob();

    console.log(`[Cron] Notification job complete:`, result);

    return NextResponse.json({
      success: true,
      message: "Notification job completed",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Notification job failed:", error);
    return NextResponse.json(
      { success: false, error: "Job failed", details: String(error) },
      { status: 500 }
    );
  }
}

// Also allow GET for Vercel Cron (which sends GET)
export { POST as GET };
