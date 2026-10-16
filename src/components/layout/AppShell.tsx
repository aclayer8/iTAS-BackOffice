import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import AppShellClient from "./AppShellClient";

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, deletedAt: true, mustChangePassword: true },
  });

  if (!account || account.status !== "ACTIVE" || account.deletedAt) redirect("/login");
  if (account.mustChangePassword) redirect("/change-password");

  const user = session.user as {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };

  return (
    <AppShellClient
      user={{
        name: user.name ?? "User",
        email: user.email ?? "",
        role: user.role ?? "VIEWER",
      }}
    >
      {children}
    </AppShellClient>
  );
}
