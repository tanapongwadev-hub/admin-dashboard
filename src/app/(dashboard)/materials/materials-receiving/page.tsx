import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listMaterialsReceiving, getMaterialsReceivingLookups } from "@/lib/api/materials-receiving";
import { MaterialsReceivingClient } from "@/components/materials-receiving/materials-receiving-client";

const PAGE_SIZE = 20;

// URL matches cps-api's own seeded menu path (/materials/materials-receiving,
// code MATERIALS_RECEIVING) exactly — see AGENTS.md ADR-005 and § Material
// Receiving. This is a real, permission-gated menu item that previously had
// no page (fell through to the [...rest] catch-all placeholder).
export default async function MaterialsReceivingPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    materialCode?: string;
    open?: string;
    receiveDateFrom?: string;
    receiveDateTo?: string;
    supplierId?: string;
    materialId?: string;
  }>;
}) {
  const session = await getCurrentSession();
  const canView = !!session && (session.user.isSuperAdmin || session.permissions.includes("MATERIALS_RECEIVING_VIEW"));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้ารับเข้าวัตถุดิบ</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดูรายการรับเข้าวัตถุดิบต้องมีสิทธิ์ Materials Receiving View กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || undefined;
  const status =
    params.status === "draft" || params.status === "confirmed" || params.status === "cancelled"
      ? params.status
      : undefined;
  // Set by /materials/pc's row actions, referenced by material.code (not a
  // raw id) so the URL stays legible/bookmarkable. Two distinct query
  // params drive two distinct behaviors from the same ?materialCode= value:
  //  - ?materialCode=X            -> persistent list filter (resolved to a
  //    real materialId below and applied every load, survives refresh)
  //  - ?materialCode=X&open=create -> ALSO auto-opens the create dialog
  //    pre-selecting that material (the "รับเข้า" row action's flow) — see
  //    materials-receiving-client.tsx.
  const materialCode = params.materialCode?.trim() || undefined;
  const openCreate = params.open === "create";
  // Receiving-date range filter (materials-receiving-filters.tsx's native
  // <input type="date"> pair) — cps-api's own receiveDateFrom/receiveDateTo
  // params, see lib/api/materials-receiving.ts#ListMaterialsReceivingParams.
  // A basic ISO-date shape check guards against a hand-edited URL sending
  // garbage through to the API.
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const receiveDateFrom = params.receiveDateFrom && isoDate.test(params.receiveDateFrom) ? params.receiveDateFrom : undefined;
  const receiveDateTo = params.receiveDateTo && isoDate.test(params.receiveDateTo) ? params.receiveDateTo : undefined;
  // Advanced-filter drawer fields (see materials-receiving-filters.tsx and
  // materials-receiving-advanced-filters.tsx) — both are already real
  // ListMaterialsReceivingParams on the backend, just never exposed in the
  // UI before this pass.
  const supplierId = params.supplierId?.trim() || undefined;

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;

  // Lookups fetched first (not in parallel with the list) because
  // resolving ?materialCode= into the real materialId the list query needs
  // depends on lookups.materials — see below.
  const lookups = await getMaterialsReceivingLookups(accessToken);

  // ?materialId= (from the advanced-filter drawer's own Select) takes
  // precedence if present; otherwise resolve ?materialCode= against the
  // already-fetched lookups (case-insensitive, same resolution
  // materials-receiving-client.tsx does for the create-dialog pre-fill).
  const materialIdParam = params.materialId?.trim() || undefined;
  const resolvedMaterial = materialCode
    ? lookups.materials.find((m) => m.code.toLowerCase() === materialCode.toLowerCase())
    : undefined;
  const materialId = materialIdParam ?? resolvedMaterial?.id;

  const list = await listMaterialsReceiving(accessToken, {
    page,
    limit: PAGE_SIZE,
    search,
    status,
    receiveDateFrom,
    receiveDateTo,
    supplierId,
    materialId,
    sortBy: "receiveDate",
    sortOrder: "desc",
  });

  const canCreate = session.user.isSuperAdmin || session.permissions.includes("MATERIALS_RECEIVING_CREATE");
  const canConfirm = session.user.isSuperAdmin || session.permissions.includes("MATERIALS_RECEIVING_CONFIRM");
  const canCancel = session.user.isSuperAdmin || session.permissions.includes("MATERIALS_RECEIVING_CANCEL");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("MATERIALS_RECEIVING_DELETE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">รับเข้าวัตถุดิบ</h1>
        <p className="mt-1 text-sm text-fg-muted">
          รับเข้าวัตถุดิบเข้าคลัง ระบบจะสร้าง Internal Lot, Supplier Lot, จำนวนกล่อง/แพ็ก และ QR Code ให้อัตโนมัติ
        </p>
      </div>

      <MaterialsReceivingClient
        receivings={list.items}
        totalItems={list.meta.totalItems}
        page={list.meta.page}
        totalPages={list.meta.totalPages}
        lookups={lookups}
        canCreate={canCreate}
        canConfirm={canConfirm}
        canCancel={canCancel}
        canDelete={canDelete}
        initialMaterialCode={openCreate ? materialCode : undefined}
      />
    </div>
  );
}
