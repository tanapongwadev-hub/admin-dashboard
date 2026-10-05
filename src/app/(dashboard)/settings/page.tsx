import type { Metadata } from "next";
import { Info } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "การตั้งค่าบัญชี" };

// Read-only account page. The previous tabs (profile/password/billing...)
// only showed success toasts without calling any API, so they were removed
// rather than left pretending to save. Account changes go through an admin
// via cps-api's user management until a real self-service API exists.
export default async function SettingsPage() {
  const session = await getCurrentSession();
  const user = session?.user;
  const role = session?.currentDepartmentRole;
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "—";

  const rows: Array<[string, string]> = [
    ["ชื่อผู้ใช้", user?.username ?? "—"],
    ["อีเมล", user?.email ?? "—"],
    ["บทบาท", role?.roleName ?? (user?.isSuperAdmin ? "ผู้ดูแลระบบสูงสุด" : "—")],
    ["หน่วยงาน", role?.departmentName ?? "—"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">การตั้งค่าบัญชี</h1>
        <p className="mt-1 text-sm text-fg-muted">ข้อมูลบัญชีผู้ใช้ที่กำลังเข้าสู่ระบบ</p>
      </div>

      <section className="max-w-2xl rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-4 border-b border-border p-5">
          <UserAvatar name={fullName} className="h-14 w-14 text-base" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-fg">{fullName}</p>
            {user?.isSuperAdmin && <Badge variant="primary">Super Admin</Badge>}
          </div>
        </div>
        <dl className="divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-3 gap-4 px-5 py-3 text-sm">
              <dt className="text-fg-secondary">{label}</dt>
              <dd className="col-span-2 break-words text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex max-w-2xl items-start gap-3 rounded-lg border border-border bg-primary-soft p-4 text-sm text-fg">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>
          ต้องการเปลี่ยนรหัสผ่าน แก้ไขข้อมูลส่วนตัว หรือปิดบัญชี กรุณาติดต่อผู้ดูแลระบบ
          ระบบยังไม่รองรับการแก้ไขด้วยตนเอง
        </p>
      </div>
    </div>
  );
}
