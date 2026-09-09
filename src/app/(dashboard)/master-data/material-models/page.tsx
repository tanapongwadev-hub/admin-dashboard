import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listMaterialModels } from "@/lib/api/material-models";
import { MaterialModelsClient } from "@/components/material-models/material-models-client";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "รุ่นวัสดุ · ข้อมูลหลัก" };

// Server Component for `/master-data/material-models` — sibling page
// under the new `master-data/` route group alongside
// `/master-data/categories`, `/master-data/loading-points`,
// `/master-data/delivery-types`, and `/master-data/reject-reasons`.
// Mirrors `master-data/reject-reasons/page.tsx`'s shape exactly:
//   - permission gate on `MATERIAL_MODEL_VIEW` (with SUPER_ADMIN override),
//   - read `page` / `search` / `status` from searchParams,
//   - fetch the initial paginated list from cps-api,
//   - render the client component which owns dialog state + Server Actions.
//
// Permission codes are real codes from cps-api (MATERIAL_MODEL_VIEW /
// CREATE / UPDATE / DELETE per `cps-api/src/modules/material-models/
// material-model-permissions.ts`), NOT the dotted
// `MATERIAL_MODEL_MANAGEMENT.*` strings cps-api's own menu-permission
// seed uses for display — same warning already established for Materials
// PC (see AGENTS.md § Materials PC and § Categories / § Loading Points /
// § Delivery Types / § Reject Reasons).
export default async function MasterDataMaterialModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const session = await getCurrentSession();
  const canView = !!session && (session.user.isSuperAdmin || session.permissions.includes("MATERIAL_MODEL_VIEW"));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้ารุ่นวัสดุ</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดูรุ่นวัสดุต้องมีสิทธิ์ Material Model View กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
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

  // Default sort is `code` per `ListMaterialModelsQueryDto` in the backend
  // DTO — every simple-master resource defaults to `code` except `/categories`
  // which defaults to `sortOrder`. Explicit here so a future reader doesn't
  // assume categories' default applies project-wide.
  const list = await listMaterialModels(accessToken, {
    page,
    limit: PAGE_SIZE,
    search,
    isActive,
    sortBy: "code",
    sortOrder: "asc",
  });

  // Mirrors master-data/categories/page.tsx and the other simple-master
  // page.tsx permission split: create/update gate is on the broader
  // CREATE+UPDATE pair, delete is the dedicated DELETE code. The
  // backend re-checks on every call regardless (UX-only here, not the
  // security boundary).
  const canEdit = session.user.isSuperAdmin || session.permissions.includes("MATERIAL_MODEL_CREATE") || session.permissions.includes("MATERIAL_MODEL_UPDATE");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("MATERIAL_MODEL_DELETE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">รุ่นวัสดุ</h1>
        <p className="mt-1 text-sm text-fg-muted">จัดการข้อมูลหลักรุ่นวัสดุที่ใช้ในระบบ</p>
      </div>

      <MaterialModelsClient
        materialModels={list.items}
        meta={list.meta}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
