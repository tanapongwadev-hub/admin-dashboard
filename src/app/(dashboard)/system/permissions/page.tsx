import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { getPermissionMatrix, listRoles, listUsers } from "@/lib/api/permission-access";
import { DepartmentPermissionMatrix } from "@/components/permissions/department-permission-matrix";
import { RoleActionsTable } from "@/components/permissions/role-actions-table";
import { UserOverridesPanel } from "@/components/permissions/user-overrides-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "สิทธิ์การเข้าถึง" };

const TABS = ["departments", "roles", "users"] as const;

export default async function PermissionManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getCurrentSession();

  // GET /permissions/matrix, PUT /permissions/access and /roles are
  // SUPER_ADMIN only (RolesGuard in cps-api); mirror that here.
  if (!session?.user.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">ต้องใช้สิทธิ์ Super Admin</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การกำหนดสิทธิ์มีผลกับเมนูและการทำงานของผู้ใช้ทุกคน จึงเปิดใช้งานได้เฉพาะบัญชี Super Admin เท่านั้น
        </p>
      </div>
    );
  }

  const { tab } = await searchParams;
  const defaultTab = TABS.includes(tab as (typeof TABS)[number]) ? tab! : "departments";
  const store = await cookies();
  const accessToken = store.get("accessToken")?.value;
  const [matrix, roles, users] = accessToken
    ? await Promise.all([
        getPermissionMatrix(accessToken).catch(() => null),
        listRoles(accessToken)
          .then((result) => result.items)
          .catch(() => null),
        listUsers(accessToken)
          .then((result) => result.items)
          .catch(() => null),
      ])
    : [null, null, null];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">สิทธิ์การเข้าถึง</h1>
        <p className="mt-1 text-sm text-fg-muted">
          แผนกกำหนดว่าเข้าเมนูไหนได้ role กำหนดว่าทำ action อะไรได้ การเปลี่ยนแปลงจะยังไม่บันทึกจนกว่าจะกดบันทึก
        </p>
      </div>

      {matrix ? (
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="departments">ตามแผนก</TabsTrigger>
            <TabsTrigger value="roles">Role</TabsTrigger>
            <TabsTrigger value="users">ผู้ใช้</TabsTrigger>
          </TabsList>
          <TabsContent value="departments">
            <DepartmentPermissionMatrix initialMatrix={matrix} />
          </TabsContent>
          <TabsContent value="roles">
            {roles ? (
              <RoleActionsTable initialRoles={roles} actions={matrix.actions} />
            ) : (
              <p className="text-sm text-danger">ไม่สามารถโหลดข้อมูล role ได้ กรุณารีเฟรชหน้านี้</p>
            )}
          </TabsContent>
          <TabsContent value="users">
            {roles && users ? (
              <UserOverridesPanel users={users} roles={roles} matrix={matrix} />
            ) : (
              <p className="text-sm text-danger">ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณารีเฟรชหน้านี้</p>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-sm text-danger">ไม่สามารถโหลดข้อมูลสิทธิ์ได้ กรุณารีเฟรชหน้านี้</p>
      )}
    </div>
  );
}
