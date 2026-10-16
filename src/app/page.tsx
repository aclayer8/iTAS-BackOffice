import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import ModuleLauncher from "./ModuleLauncher";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, deletedAt: true, mustChangePassword: true },
  });

  if (!account || account.status !== "ACTIVE" || account.deletedAt) redirect("/login");
  if (account.mustChangePassword) redirect("/change-password");

  return (
    <ModuleLauncher
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
      }}
    />
  );
}
