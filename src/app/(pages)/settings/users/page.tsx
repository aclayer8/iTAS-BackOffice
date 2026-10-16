import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import UserManager from "./UserManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, status: true, mustChangePassword: true, lastLoginAt: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });
  return <UserManager initialUsers={users.map((user) => ({ ...user, lastLoginAt: user.lastLoginAt?.toISOString() ?? null }))} />;
}
