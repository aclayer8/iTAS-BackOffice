// =============================================================
// iTAS BackOffice — API Route Helpers & Middleware
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import type { Permission, UserRole, ApiResponse } from "@/types";
import prisma from "./prisma";

// ---- Standard API Response Builders ----

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(error: string): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

export function unauthorized(): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

export function forbidden(): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { success: false, error: "Forbidden — insufficient permissions" },
    { status: 403 }
  );
}

export function notFound(entity = "Resource"): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { success: false, error: `${entity} not found` },
    { status: 404 }
  );
}

export function conflict(error: string): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error }, { status: 409 });
}

export function serverError(error: unknown): NextResponse<ApiResponse<never>> {
  const message =
    process.env.NODE_ENV === "development"
      ? String(error)
      : "Internal server error";
  console.error("[API Error]", error);
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

// ---- Auth Guard ----

export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, userId: string, role: UserRole) => Promise<NextResponse>,
  permission?: Permission
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) return unauthorized();

    const { id: userId, role } = session.user as { id: string; role: UserRole };

    if (permission && !hasPermission(role, permission)) {
      return forbidden();
    }

    return await handler(req, userId, role);
  } catch (error) {
    return serverError(error);
  }
}

// ---- Pagination Helper ----

export function parsePagination(req: NextRequest): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ---- Soft Delete Helper ----

export const notDeleted = { deletedAt: null };

export async function softDelete(
  model: { update: Function },
  id: string
): Promise<void> {
  await model.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ---- Audit Log Helper ----

export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  description,
  req,
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  description?: string;
  req?: NextRequest;
}) {
  const ipAddress = req?.headers.get("x-forwarded-for") ??
    req?.headers.get("x-real-ip") ?? undefined;
  const userAgent = req?.headers.get("user-agent") ?? undefined;

  await prisma.auditLog.create({
    data: {
      userId,
      action: action as never,
      entityType,
      entityId,
      oldValues: oldValues as never,
      newValues: newValues as never,
      description,
      ipAddress,
      userAgent,
    },
  });
}

// ---- Expiry Status Helper ----

export function getExpiryStatus(endDate: Date | null | undefined): {
  label: string;
  variant: "default" | "warning" | "destructive" | "success";
  daysRemaining: number | null;
} {
  if (!endDate) return { label: "N/A", variant: "default", daysRemaining: null };

  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { label: "Expired", variant: "destructive", daysRemaining };
  }
  if (daysRemaining <= 30) {
    return { label: `${daysRemaining}d`, variant: "destructive", daysRemaining };
  }
  if (daysRemaining <= 90) {
    return { label: `${daysRemaining}d`, variant: "warning", daysRemaining };
  }
  return { label: `${daysRemaining}d`, variant: "success", daysRemaining };
}
