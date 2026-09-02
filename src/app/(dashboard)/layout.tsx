import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return (
    <DashboardShell
      user={session.user}
      currentDepartmentRole={session.currentDepartmentRole}
      menus={session.menus}
    >
      {children}
    </DashboardShell>
  );
}
