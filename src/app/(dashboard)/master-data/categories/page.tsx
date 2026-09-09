import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listCategories } from "@/lib/api/categories";
import { CategoriesClient } from "@/components/categories/categories-client";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "หมวดหมู่ · ข้อมูลหลัก" };

// Server Component for `/master-data/categories` — the first page under a
// new `master-data/` route group. Mirrors `materials/pc/page.tsx`'s shape:
//   - permission gate on `CATEGORY_VIEW` (with SUPER_ADMIN override),
//   - read `page` / `search` / `status` from searchParams,
//   - fetch the initial paginated list from cps-api,
//   - render the client component which owns dialog state + Server Actions.
//
// Permission codes are real codes from cps-api (CATEGORY_VIEW / CREATE /
// UPDATE / DELETE per `cps-api/API_ENDPOINTS.md` § 5.1 and the
// `category-permissions.ts` file), NOT the dotted
// `CATEGORIES_MASTER.*` strings cps-api's own menu-permission seed uses for
// display — same warning that already exists for materials in
// `materials/pc/page.tsx` and that landed in the project after a previous
// investigation (see AGENTS.md § Materials PC).
export default async function MasterDataCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const session = await getCurrentSession();
  const canView = !!session && (session.user.isSuperAdmin || session.permissions.includes("CATEGORY_VIEW"));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้าหมวดหมู่</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดูหมวดหมู่ต้องมีสิทธิ์ Category View กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
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

  // Default sort is `sortOrder` per `cps-api/API_ENDPOINTS.md` § 5.1 (this
  // resource is the only simple master whose default sort is NOT `code`).
  // Tie-break `id` is added server-side so two rows with the same sortOrder
  // still come back in a deterministic order.
  const list = await listCategories(accessToken, {
    page,
    limit: PAGE_SIZE,
    search,
    isActive,
    sortBy: "sortOrder",
    sortOrder: "asc",
  });

  // Mirrors materials/pc/page.tsx's permission split: create/update gate
  // is on the broader CREATE+UPDATE pair, delete is the dedicated DELETE
  // code. The backend re-checks on every call regardless (UX-only here,
  // not the security boundary).
  const canEdit = session.user.isSuperAdmin || session.permissions.includes("CATEGORY_CREATE") || session.permissions.includes("CATEGORY_UPDATE");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("CATEGORY_DELETE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">หมวดหมู่</h1>
        <p className="mt-1 text-sm text-fg-muted">จัดการข้อมูลหลักหมวดหมู่ที่ใช้ในระบบ</p>
      </div>

      <CategoriesClient
        categories={list.items}
        meta={list.meta}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
