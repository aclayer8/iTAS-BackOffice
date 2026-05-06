// =============================================================
// iTAS BackOffice — Health Check Endpoint
// GET /api/health — Used by Docker health checks + monitoring
// =============================================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const start = Date.now();

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbMs = Date.now() - start;

    return NextResponse.json({
      status:    "healthy",
      timestamp: new Date().toISOString(),
      version:   process.env.npm_package_version ?? "1.0.0",
      checks: {
        database: { status: "up", responseMs: dbMs },
        app:      { status: "up", uptime: Math.floor(process.uptime()) + "s" },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status:  "unhealthy",
        error:   "Database connection failed",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 503 }
    );
  }
}
