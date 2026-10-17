import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listRoles } from "@/lib/api/permission-access";
import { listDepartments, listUsersPage } from "@/lib/api/users";
import { UsersClient } from "@/components/users/users-client";
import { assignableRoles } from "@/components/users/user-row-actions";

export const metadata: Metadata = { title: "ผู้ใช้งาน" };

const PAGE_SIZE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; new?: string }>;
}) {
  const session = await getCurrentSession();

  // Every cps-api /users, /departments and /roles route is SUPER_ADMIN only
  // (RolesGuard); mirror that here instead of letting the page hit a 403.
  if (!session?.user.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">ต้องใช้สิทธิ์ Super Admin</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การสร้างผู้ใช้และกำหนดแผนกมีผลกับสิทธิ์ของทุกคน จึงเปิดใช้งานได้เฉพาะบัญชี Super Admin เท่านั้น
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const accessToken = (await cookies()).get("accessToken")!.value;
  const search = params.search?.trim() || undefined;
  const [users, departments, roles] = await Promise.all([
    listUsersPage(accessToken, { page: Math.max(1, Number(params.page) || 1), limit: PAGE_SIZE, search }),
    listDepartments(accessToken).then((result) => result.items.filter((d) => d.isActive).sort((a, b) => a.nameEn.localeCompare(b.nameEn))),
    listRoles(accessToken).then((result) => assignableRoles(result.items)),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">ผู้ใช้งาน</h1>
        <p className="mt-1 text-sm text-fg-muted">
          สร้างบัญชี กำหนดแผนกและ role ตั้งรหัสผ่านใหม่ และปิดใช้งานผู้ใช้ สิทธิ์รายบุคคลจัดการที่หน้าสิทธิ์การเข้าถึง
        </p>
      </div>
      <UsersClient
        users={users}
        departments={departments}
        roles={roles}
        currentUserId={session.user.id}
        openCreate={params.new === "1"}
      />
    </div>
  );
}
