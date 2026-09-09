import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listUnits } from "@/lib/api/units";
import { UnitsClient } from "@/components/units/units-client";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "หน่วยนับ · ข้อมูลหลัก" };

// Server Component for `/master-data/units` — sibling page
// under the `master-data/` route group alongside
// `/master-data/categories`, `/master-data/loading-points`,
// `/master-data/delivery-types`, `/master-data/reject-reasons`,
// `/master-data/material-models`, and `/master-data/suppliers`.
// Mirrors the other simple-master page.tsx files' shape exactly:
//   - permission gate on `UNIT_VIEW` (with SUPER_ADMIN override),
//   - read `page` / `search` / `status` from searchParams,
//   - fetch the initial paginated list from cps-api,
//   - render the client component which owns dialog state + Server Actions.
//
// Permission codes are real codes from cps-api (UNIT_VIEW /
// CREATE / UPDATE / DELETE per `cps-api/src/modules/units/
// unit-permissions.ts`), NOT the dotted `UNIT_MANAGEMENT.*` strings
// the menu-permission seed uses for display.
export default async function MasterDataUnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const session = await getCurrentSession();
  const canView = !!session && (session.user.isSuperAdmin || session.permissions.includes("UNIT_VIEW"));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้าหน่วยนับ</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดูหน่วยนับต้องมีสิทธิ์ Unit View กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || undefined;
  const isActive = params.status === "active" ? true : params.status === "inactive" ? false : undefined;

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;

  // Default sort is `code` per `ListUnitsQueryDto` in the backend DTO.
  const list = await listUnits(accessToken, {
    page,
    limit: PAGE_SIZE,
    search,
    isActive,
    sortBy: "code",
    sortOrder: "asc",
  });

  const canEdit = session.user.isSuperAdmin || session.permissions.includes("UNIT_CREATE") || session.permissions.includes("UNIT_UPDATE");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("UNIT_DELETE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">หน่วยนับ</h1>
        <p className="mt-1 text-sm text-fg-muted">จัดการข้อมูลหลักหน่วยนับที่ใช้ในระบบ</p>
      </div>

      <UnitsClient
        units={list.items}
        meta={list.meta}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
