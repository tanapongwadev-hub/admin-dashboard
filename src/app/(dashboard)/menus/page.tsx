import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { getManagementTree } from "@/lib/api/menus";
import { MenuTreeEditor } from "@/components/menus/menu-tree-editor";

export default async function MenuManagementPage() {
  const session = await getCurrentSession();

  // The real /menus endpoints are SUPER_ADMIN-only (JwtAuthGuard +
  // RolesGuard on the whole controller — see cps-api/src/modules/menus/
  // menus.controller.ts). Mirror that here with a friendly message instead
  // of letting the page 403 against the API.
  if (!session?.user.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">ต้องใช้สิทธิ์ Super Admin</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การจัดการเมนูมีผลต่อการนำทางที่ผู้ใช้ทุกคนมองเห็น จึงเปิดใช้งานได้เฉพาะบัญชี Super Admin เท่านั้น
        </p>
      </div>
    );
  }

  const store = await cookies();
  const accessToken = store.get("accessToken")?.value;
  const tree = accessToken ? await getManagementTree(accessToken) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">จัดการเมนู</h1>
        <p className="mt-1 text-sm text-fg-muted">
          ลากเมนูเพื่อจัดลำดับใหม่ หรือวางลงบนเมนูอื่นเพื่อซ้อนเป็นเมนูย่อย การเปลี่ยนแปลงจะยังไม่บันทึกจนกว่าคุณจะกดบันทึก
        </p>
      </div>

      {tree ? (
        <MenuTreeEditor initialMenus={tree.menus} initialVersion={tree.version} />
      ) : (
        <p className="text-sm text-danger">ไม่สามารถโหลดโครงสร้างเมนูได้ กรุณารีเฟรชหน้านี้</p>
      )}
    </div>
  );
}
