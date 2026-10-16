import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { SALT_ROUNDS } from "@/lib/auth";
import { createAuditLog, withAuth } from "@/lib/api-helpers";
import { validateTemporaryPassword } from "@/lib/password-policy";
import prisma from "@/lib/prisma";

const schema = z.object({ temporaryPassword: z.string().max(128) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(request, async (req, userId) => {
    const { id } = await context.params;
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    const policyError = validateTemporaryPassword(parsed.data.temporaryPassword);
    if (policyError) return NextResponse.json({ success: false, error: policyError }, { status: 400 });
    const target = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!target) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    await prisma.user.update({ where: { id }, data: {
      passwordHash: await bcrypt.hash(parsed.data.temporaryPassword, SALT_ROUNDS),
      mustChangePassword: true,
      passwordChangedAt: new Date(),
    } });
    await createAuditLog({ userId, action: "UPDATE", entityType: "user_password", entityId: id, newValues: { mustChangePassword: true }, description: "Administrator reset a user password", req });
    return NextResponse.json({ success: true });
  }, "user:write");
}
