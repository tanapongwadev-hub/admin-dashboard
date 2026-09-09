import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listLoadingPoints } from "@/lib/api/loading-points";
import { LoadingPointsClient } from "@/components/loading-points/loading-points-client";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "จุดขนถ่าย · ข้อมูลหลัก" };

// Server Component for `/master-data/loading-points` — sibling page
// under the new `master-data/` route group alongside `/master-data/categories`.
// Mirrors `master-data/categories/page.tsx`'s shape exactly:
//   - permission gate on `LOADING_POINT_VIEW` (with SUPER_ADMIN override),
//   - read `page` / `search` / `status` from searchParams,
//   - fetch the initial paginated list from cps-api,
//   - render the client component which owns dialog state + Server Actions.
//
// Permission codes are real codes from cps-api (LOADING_POINT_VIEW /
// CREATE / UPDATE / DELETE per `cps-api/API_ENDPOINTS.md` § 5.1 and the
// `loading-point-permissions.ts` file), NOT the dotted
// `LOADING_POINT_MANAGEMENT.*` strings cps-api's own menu-permission
// seed uses for display — same warning already established for Materials
// PC (see AGENTS.md § Materials PC and § Categories).
export default async function MasterDataLoadingPointsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const session = await getCurrentSession();
  const canView = !!session && (session.user.isSuperAdmin || session.permissions.includes("LOADING_POINT_VIEW"));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้าจุดขนถ่าย</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดูจุดขนถ่ายต้องมีสิทธิ์ Loading Point View กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
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

  // Default sort is `code` per `cps-api/API_ENDPOINTS.md` § 5.1 — every
  // simple-master resource defaults to `code` except `/categories` which
  // defaults to `sortOrder`. Explicit here so a future reader doesn't
  // assume categories' default applies project-wide.
  const list = await listLoadingPoints(accessToken, {
    page,
    limit: PAGE_SIZE,
    search,
    isActive,
    sortBy: "code",
    sortOrder: "asc",
  });

  // Mirrors master-data/categories/page.tsx and materials/pc/page.tsx's
  // permission split: create/update gate is on the broader CREATE+UPDATE
  // pair, delete is the dedicated DELETE code. The backend re-checks on
  // every call regardless (UX-only here, not the security boundary).
  const canEdit = session.user.isSuperAdmin || session.permissions.includes("LOADING_POINT_CREATE") || session.permissions.includes("LOADING_POINT_UPDATE");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("LOADING_POINT_DELETE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">จุดขนถ่าย</h1>
        <p className="mt-1 text-sm text-fg-muted">จัดการข้อมูลหลักจุดขนถ่ายสินค้าที่ใช้ในระบบ</p>
      </div>

      <LoadingPointsClient
        loadingPoints={list.items}
        meta={list.meta}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
