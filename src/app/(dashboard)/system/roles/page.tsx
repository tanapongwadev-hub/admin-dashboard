import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/session";
import { listRolesAll } from "@/lib/api/access-master";
import { RoleClient } from "@/components/access-master/role-client";
import { AccessPageHeader, SuperAdminGate } from "@/components/access-master/super-admin-gate";

export const metadata: Metadata = { title: "จัดการบทบาท" };

export default async function RolesPage() {
  const session = await getCurrentSession();
  if (!session?.user.isSuperAdmin) return <SuperAdminGate what="การจัดการบทบาท" />;
  const token = (await cookies()).get("accessToken")!.value;
  const { items } = await listRolesAll(token);
  return (
    <div className="flex flex-col gap-6">
      <AccessPageHeader title="จัดการบทบาท" description="สร้างและแก้ไข role และเปิดหรือปิดใช้งาน ส่วน action ที่แต่ละ role ทำได้ตั้งที่หน้าสิทธิ์การเข้าถึง" />
      <RoleClient roles={items} />
    </div>
  );
}
