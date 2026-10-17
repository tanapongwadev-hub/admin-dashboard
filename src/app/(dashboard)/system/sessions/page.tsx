import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/session";
import { listSessions } from "@/lib/api/access-master";
import { SessionClient } from "@/components/access-master/session-client";
import { AccessPageHeader, SuperAdminGate } from "@/components/access-master/super-admin-gate";

export const metadata: Metadata = { title: "จัดการเซสชัน" };

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getCurrentSession();
  if (!session?.user.isSuperAdmin) return <SuperAdminGate what="การจัดการเซสชัน" />;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const token = (await cookies()).get("accessToken")!.value;
  const data = await listSessions(token, page);
  return (
    <div className="flex flex-col gap-6">
      <AccessPageHeader title="จัดการเซสชัน" description="ดูการเข้าสู่ระบบทั้งหมดและยกเลิกเซสชันที่ยังใช้งานอยู่ เพื่อบังคับผู้ใช้ออกจากระบบ" />
      <SessionClient page={data} nowIso={new Date().toISOString()} />
    </div>
  );
}
