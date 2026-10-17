import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getCurrentSession } from "@/lib/session";
import { loadDashboardData } from "@/lib/dashboard-loader";

function shiftGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false }).format(new Date()),
  );
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 18) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

// Server Component: reads the session, fetches real cps-api data (each block
// gated by the viewer's own permission, see lib/dashboard-loader.ts) and hands
// it to the client DashboardView, which only owns the 7/14-day window.
export default async function DashboardPage() {
  const session = await getCurrentSession();
  const firstName = session?.user.firstName || session?.user.username || "there";
  const accessToken = (await cookies()).get("accessToken")?.value;
  const data = await loadDashboardData(accessToken ?? "", session ?? { user: { isSuperAdmin: false }, permissions: [] });

  return <DashboardView greeting={`${shiftGreeting()}, ${firstName}`} data={data} />;
}

export const metadata: Metadata = { title: "แดชบอร์ด" };
