import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import {
  listMaterialsDisbursement,
  getMaterialsDisbursementLookups,
  type DisbursementStatus,
  type DisbursementType,
} from "@/lib/api/materials-disbursement";
import { MaterialsDisbursementClient } from "@/components/materials-disbursement/materials-disbursement-client";

const PAGE_SIZE = 20;

// URL matches cps-api's own seeded menu path (/materials/materials-disbursement,
// code MATERIALS_DISBURSEMENT) exactly — see AGENTS.md ADR-005 and § Material
// Disbursement. This was a real, permission-granted menu item with no page
// yet (fell through to the [...rest] catch-all) before the List+Filter pass.
//
// Full CRUD as of 2026-09-20 (create/update/delete/confirm/cancel) — the
// backend's create/update/confirm/cancel/FIFO-consumption support (see
// cps-api/src/modules/materials-disbursement/) is now wired end-to-end,
// mirroring /materials/materials-receiving's Server-Component-fetch +
// Server-Action-mutation pattern (see AGENTS.md § Material Disbursement).
export default async function MaterialsDisbursementPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    disbursementType?: string;
    materialCode?: string;
    materialId?: string;
    disbursementDateFrom?: string;
    disbursementDateTo?: string;
  }>;
}) {
  const session = await getCurrentSession();
  const canView = !!session && (session.user.isSuperAdmin || session.permissions.includes("MATERIALS_DISBURSEMENT_VIEW"));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้าจ่ายออกวัสดุ</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดูรายการจ่ายออกวัสดุต้องมีสิทธิ์ Materials Disbursement View กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || undefined;
  const status =
    params.status === "draft" || params.status === "confirmed" || params.status === "cancelled"
      ? (params.status as DisbursementStatus)
      : undefined;
  const disbursementType =
    params.disbursementType === "stock_cut" || params.disbursementType === "production"
      ? (params.disbursementType as DisbursementType)
      : undefined;
  const materialCode = params.materialCode?.trim() || undefined;
  // Disbursement-date range filter (materials-disbursement-filters.tsx's
  // native <input type="date"> pair) — same shape as Materials Receiving's
  // own receiveDateFrom/receiveDateTo (see lib/api/materials-receiving.ts),
  // cps-api's already-supported disbursementDateFrom/disbursementDateTo
  // params (see lib/api/materials-disbursement.ts#ListMaterialsDisbursementParams).
  // A basic ISO-date shape check guards against a hand-edited URL sending
  // garbage through to the API.
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const disbursementDateFrom =
    params.disbursementDateFrom && isoDate.test(params.disbursementDateFrom) ? params.disbursementDateFrom : undefined;
  const disbursementDateTo =
    params.disbursementDateTo && isoDate.test(params.disbursementDateTo) ? params.disbursementDateTo : undefined;

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;

  // Lookups fetched first (not in parallel with the list) because
  // resolving ?materialCode= into the real materialId the list query needs
  // depends on lookups.materials — same pattern as
  // materials/materials-receiving/page.tsx.
  const lookups = await getMaterialsDisbursementLookups(accessToken);

  const materialIdParam = params.materialId?.trim() || undefined;
  const resolvedMaterial = materialCode
    ? lookups.materials.find((m) => m.code.toLowerCase() === materialCode.toLowerCase())
    : undefined;
  const materialId = materialIdParam ?? resolvedMaterial?.id;

  const list = await listMaterialsDisbursement(accessToken, {
    page,
    limit: PAGE_SIZE,
    search,
    status,
    disbursementType,
    materialId,
    disbursementDateFrom,
    disbursementDateTo,
    sortBy: "disbursementDate",
    sortOrder: "desc",
  });

  const canCreate = session.user.isSuperAdmin || session.permissions.includes("MATERIALS_DISBURSEMENT_CREATE");
  const canUpdate = session.user.isSuperAdmin || session.permissions.includes("MATERIALS_DISBURSEMENT_UPDATE");
  const canConfirm = session.user.isSuperAdmin || session.permissions.includes("MATERIALS_DISBURSEMENT_CONFIRM");
  const canCancel = session.user.isSuperAdmin || session.permissions.includes("MATERIALS_DISBURSEMENT_CANCEL");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("MATERIALS_DISBURSEMENT_DELETE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">จ่ายออกวัสดุ</h1>
        <p className="mt-1 text-sm text-fg-muted">สร้างและจัดการรายการจ่ายออกวัสดุ ตัดสต็อกหรือเบิกเพื่อผลิต</p>
      </div>

      <MaterialsDisbursementClient
        disbursements={list.items}
        meta={list.meta}
        lookups={lookups}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canConfirm={canConfirm}
        canCancel={canCancel}
        canDelete={canDelete}
      />
    </div>
  );
}
