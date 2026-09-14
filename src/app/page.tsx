import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ModuleLauncher from "./ModuleLauncher";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <ModuleLauncher
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
      }}
    />
  );
}
