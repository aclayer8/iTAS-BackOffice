import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth, SALT_ROUNDS } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validatePassword } from "@/lib/password-policy";
import { createAuditLog } from "@/lib/api-helpers";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().max(128),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const policyError = validatePassword(parsed.data.newPassword);
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 });
  if (parsed.data.currentPassword === parsed.data.newPassword) return NextResponse.json({ error: "New password must be different" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, status: true, deletedAt: true },
  });
  if (
    !user ||
    user.status !== "ACTIVE" ||
    user.deletedAt ||
    !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))
  ) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data: {
    passwordHash: await bcrypt.hash(parsed.data.newPassword, SALT_ROUNDS),
    mustChangePassword: false,
    passwordChangedAt: new Date(),
  } });
  await createAuditLog({ userId: session.user.id, action: "UPDATE", entityType: "user_password", entityId: session.user.id, description: "User changed their password", req: request });
  return NextResponse.json({ success: true });
}
