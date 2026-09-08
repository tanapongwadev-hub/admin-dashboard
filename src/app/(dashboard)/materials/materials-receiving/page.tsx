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
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
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

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;

  const [list, lookups] = await Promise.all([
    listMaterialsReceiving(accessToken, {
      page,
      limit: PAGE_SIZE,
      search,
      status,
      sortBy: "receiveDate",
      sortOrder: "desc",
    }),
    getMaterialsReceivingLookups(accessToken),
  ]);

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
      />
    </div>
  );
}
