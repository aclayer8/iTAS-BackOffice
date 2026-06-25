import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShellClient from "./AppShellClient";

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

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
