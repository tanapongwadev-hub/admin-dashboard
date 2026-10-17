import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listDepartments, listUsers } from "@/lib/api/users";
import { listRoles } from "@/lib/api/permission-access";
import { readUsersFilters } from "@/lib/filters/users-filters";
import { UsersClient } from "@/components/users/users-client";

export const metadata: Metadata = { title: "ผู้ใช้งาน" };

const PAGE_SIZE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentSession();

  // cps-api guards every /users, /roles and /departments route with
  // @Roles(SUPER_ADMIN); mirror that here instead of rendering a 403.
  if (!session?.user.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">ต้องใช้สิทธิ์ Super Admin</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การสร้างและแก้ไขบัญชีผู้ใช้เปิดใช้งานได้เฉพาะบัญชี Super Admin เท่านั้น
        </p>
      </div>
    );
  }

  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
  }
  const filters = readUsersFilters(params);
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);

  const store = await cookies();
  const accessToken = store.get("accessToken")?.value;
  const [result, roles, departments] = accessToken
    ? await Promise.all([
        listUsers(accessToken, {
          page,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
          status: filters.status === "all" ? undefined : filters.status,
        }).catch(() => null),
        listRoles(accessToken)
          .then((data) => data.items)
          .catch(() => null),
        listDepartments(accessToken)
          .then((data) => data.items)
          .catch(() => null),
      ])
    : [null, null, null];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">ผู้ใช้งาน</h1>
        <p className="mt-1 text-sm text-fg-muted">
          สร้างบัญชี มอบหมายแผนกและ role ระงับหรือรีเซ็ตรหัสผ่าน แผนกกำหนดว่าเห็นเมนูไหน role กำหนดว่าทำอะไรได้
        </p>
      </div>
      {result && roles && departments ? (
        <UsersClient
          users={result.items}
          meta={result.meta}
          roles={roles}
          departments={departments}
          currentUserId={session.user.id}
        />
      ) : (
        <p className="text-sm text-danger">ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณารีเฟรชหน้านี้</p>
      )}
    </div>
  );
}
