import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getCurrentSession } from "@/lib/session";

function shiftGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 18) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

// Stays a Server Component for the session read; everything below it is the
// client-side DashboardView, which owns the filter/date-range state. The
// dashboard's own content is still src/lib/dashboard-data.ts mock data — see
// AGENTS.md § Conventions › API.
export default async function DashboardPage() {
  const session = await getCurrentSession();
  const firstName = session?.user.firstName || session?.user.username || "there";

  return <DashboardView greeting={`${shiftGreeting()}, ${firstName}`} />;
}
