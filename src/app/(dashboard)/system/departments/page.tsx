import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/session";
import { listDepartmentsAll } from "@/lib/api/access-master";
import { DepartmentClient } from "@/components/access-master/department-client";
import { AccessPageHeader, SuperAdminGate } from "@/components/access-master/super-admin-gate";

export const metadata: Metadata = { title: "จัดการแผนก" };

export default async function DepartmentsPage() {
  const session = await getCurrentSession();
  if (!session?.user.isSuperAdmin) return <SuperAdminGate what="การจัดการแผนก" />;
  const token = (await cookies()).get("accessToken")!.value;
  const { items } = await listDepartmentsAll(token);
  return (
    <div className="flex flex-col gap-6">
      <AccessPageHeader title="จัดการแผนก" description="สร้างกลุ่มและแผนกย่อย กำหนดกลุ่มแม่ และเปิดหรือปิดใช้งาน ตั้งสิทธิ์เมนูของแต่ละกลุ่มที่หน้าสิทธิ์การเข้าถึง" />
      <DepartmentClient departments={items} />
    </div>
  );
}
