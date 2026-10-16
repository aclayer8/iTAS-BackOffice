import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, withAuth } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .refine((value) => value.endsWith("@i-tas.co.th"), "Company email required"),
  role: z.enum(["ADMIN", "SALE", "ENGINEER", "VIEWER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

type RouteContext = { params: Promise<{ id: string }> };

function conflictError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function ensureAnotherActiveAdmin(
  tx: Prisma.TransactionClient,
  target: { id: string; role: UserRole; status: UserStatus }
) {
  if (target.role !== "ADMIN" || target.status !== "ACTIVE") return true;
  const otherAdmins = await tx.user.count({
    where: {
      id: { not: target.id },
      role: "ADMIN",
      status: "ACTIVE",
      deletedAt: null,
    },
  });
  return otherAdmins > 0;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withAuth(
    request,
    async (req, actorId) => {
      const { id } = await context.params;
      const parsed = updateSchema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
          { status: 400 }
        );
      }

      try {
        const updated = await prisma.$transaction(
          async (tx) => {
            const target = await tx.user.findFirst({
              where: { id, deletedAt: null },
              select: { id: true, role: true, status: true },
            });
            if (!target) return null;

            const changesOwnAccess =
              id === actorId &&
              (parsed.data.role !== target.role || parsed.data.status !== target.status);
            if (changesOwnAccess) throw new Error("SELF_ACCESS_CHANGE");

            const removesActiveAdmin =
              target.role === "ADMIN" &&
              target.status === "ACTIVE" &&
              (parsed.data.role !== "ADMIN" || parsed.data.status !== "ACTIVE");
            if (removesActiveAdmin && !(await ensureAnotherActiveAdmin(tx, target))) {
              throw new Error("LAST_ADMIN");
            }

            return tx.user.update({
              where: { id },
              data: parsed.data,
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                mustChangePassword: true,
                lastLoginAt: true,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );

        if (!updated) {
          return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }
        await createAuditLog({
          userId: actorId,
          action: "UPDATE",
          entityType: "user",
          entityId: id,
          newValues: { role: updated.role, status: updated.status },
          description: "Administrator updated a local user",
          req,
        });
        return NextResponse.json({ success: true, data: updated });
      } catch (error) {
        if (conflictError(error)) {
          return NextResponse.json({ success: false, error: "Email already exists" }, { status: 409 });
        }
        if (error instanceof Error && error.message === "SELF_ACCESS_CHANGE") {
          return NextResponse.json(
            { success: false, error: "You cannot change your own role or status" },
            { status: 400 }
          );
        }
        if (error instanceof Error && error.message === "LAST_ADMIN") {
          return NextResponse.json(
            { success: false, error: "At least one active administrator is required" },
            { status: 400 }
          );
        }
        throw error;
      }
    },
    "user:write"
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withAuth(
    request,
    async (req, actorId) => {
      const { id } = await context.params;
      if (id === actorId) {
        return NextResponse.json(
          { success: false, error: "You cannot delete your own account" },
          { status: 400 }
        );
      }

      const deleted = await prisma.$transaction(
        async (tx) => {
          const target = await tx.user.findFirst({
            where: { id, deletedAt: null },
            select: { id: true, role: true, status: true },
          });
          if (!target) return null;
          if (!(await ensureAnotherActiveAdmin(tx, target))) throw new Error("LAST_ADMIN");
          return tx.user.update({
            where: { id },
            data: { status: "INACTIVE", deletedAt: new Date(), refreshToken: null },
            select: { id: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      ).catch((error) => {
        if (error instanceof Error && error.message === "LAST_ADMIN") return "LAST_ADMIN" as const;
        throw error;
      });

      if (deleted === "LAST_ADMIN") {
        return NextResponse.json(
          { success: false, error: "At least one active administrator is required" },
          { status: 400 }
        );
      }
      if (!deleted) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
      }

      await createAuditLog({
        userId: actorId,
        action: "DELETE",
        entityType: "user",
        entityId: id,
        newValues: { status: "INACTIVE", deleted: true },
        description: "Administrator deleted a local user",
        req,
      });
      return NextResponse.json({ success: true });
    },
    "user:delete"
  );
}
