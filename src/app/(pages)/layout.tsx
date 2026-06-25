import AppShell from "@/components/layout/AppShell";

export default function ProtectedPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
