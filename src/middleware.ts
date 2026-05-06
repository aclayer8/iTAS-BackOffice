// =============================================================
// iTAS BackOffice — Next.js Middleware (Simplified for dev)
// Auth middleware ที่สมบูรณ์อยู่ใน src/middleware.full.ts
// =============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
