import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";

// login/page.tsx is a client component, so its title lives here.
export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

// Someone already signed in has nothing to do on the login form — send them
// to the dashboard. Only checked when an access cookie exists, so a normal
// signed-out visit costs no API call.
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const hasToken = (await cookies()).has("accessToken");
  if (hasToken) {
    const session = await getCurrentSession().catch(() => null);
    if (session) redirect("/dashboard");
  }
  return children;
}
