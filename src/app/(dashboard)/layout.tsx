import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getDashboardContext } from "@/lib/services/dashboard-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getDashboardContext();

  if (!context) {
    redirect("/login");
  }

  return <AppShell context={context}>{children}</AppShell>;
}
