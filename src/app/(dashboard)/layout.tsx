import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    // `getCurrentSession` only *detects* the 401 and returns null — it can't
    // write cookies itself (Next.js 15+ only allows `cookies().delete()`
    // from Server Actions or Route Handlers, and Server Components like
    // this layout aren't either). Bounce through the clear-cookies Route
    // Handler first to drop the stale `accessToken` / `refreshToken` and
    // best-effort invalidate the server-side session, then forward to
    // /login. Without this hop, the next request would carry the same
    // stale token, get the same 401, and bounce the user back to /login
    // again — the loop this redirect is here to break.
    redirect("/api/auth/clear-cookies?next=/login");
  }

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
