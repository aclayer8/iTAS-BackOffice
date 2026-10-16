import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { SALT_ROUNDS } from "@/lib/auth";
import { createAuditLog, withAuth } from "@/lib/api-helpers";
import { validateTemporaryPassword } from "@/lib/password-policy";
import prisma from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().refine((value) => value.endsWith("@i-tas.co.th"), "Company email required"),
  role: z.enum(["ADMIN", "SALE", "ENGINEER", "VIEWER"]).default("VIEWER"),
  temporaryPassword: z.string().max(128),
});

export async function GET(request: NextRequest) {
  return withAuth(request, async () => NextResponse.json({ success: true, data: await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, status: true, mustChangePassword: true, lastLoginAt: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  }) }), "user:read");
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId) => {
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    const policyError = validateTemporaryPassword(parsed.data.temporaryPassword);
    if (policyError) return NextResponse.json({ success: false, error: policyError }, { status: 400 });
    if (await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })) {
      return NextResponse.json({ success: false, error: "Email already exists" }, { status: 409 });
    }
    const user = await prisma.user.create({ data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.temporaryPassword, SALT_ROUNDS),
      mustChangePassword: true,
    }, select: { id: true, name: true, email: true, role: true, status: true, mustChangePassword: true } });
    await createAuditLog({ userId, action: "CREATE", entityType: "user", entityId: user.id, newValues: { role: user.role }, description: "Created local user", req });
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  }, "user:write");
}
