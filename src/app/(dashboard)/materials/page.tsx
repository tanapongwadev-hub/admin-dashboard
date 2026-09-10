import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { MaterialsDashboardView } from "@/components/materials-dashboard/materials-dashboard-view";
import { listMaterialInventory, listMaterials } from "@/lib/api/materials";
import { listMaterialsReceiving } from "@/lib/api/materials-receiving";
import { getCurrentSession } from "@/lib/session";

export default async function MaterialsDashboardPage() {
  const session = await getCurrentSession();
  const canViewMaterials = !!session && (session.user.isSuperAdmin || session.permissions.includes("MATERIAL_VIEW"));
  const canViewStock = !!session && (session.user.isSuperAdmin || session.permissions.includes("MATERIALS_RECEIVING_VIEW"));

  if (!session || (!canViewMaterials && !canViewStock)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" aria-hidden="true" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงภาพรวมวัตถุดิบ</p>
        <p className="max-w-sm text-sm text-fg-muted">
          หน้านี้ต้องใช้สิทธิ์ Material View หรือ Materials Receiving View กรุณาติดต่อผู้ดูแลระบบ
        </p>
      </div>
    );
  }

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;

  // Stock and receiving share MATERIALS_RECEIVING_VIEW. Keep the fallback
  // material count separate so MATERIAL_VIEW-only users still get a useful
  // landing page without requesting an endpoint they cannot access.
  const inventoryPromise = canViewStock
    ? Promise.all([
        listMaterialInventory(accessToken, {
          page: 1,
          limit: 6,
          isActive: true,
          stockStatus: "OUT_OF_STOCK",
          sortBy: "code",
          sortOrder: "asc",
        }),
        listMaterialInventory(accessToken, {
          page: 1,
          limit: 6,
          isActive: true,
          stockStatus: "LOW_STOCK",
          sortBy: "currentStock",
          sortOrder: "asc",
        }),
      ])
    : Promise.resolve(null);
  const materialListPromise = !canViewStock && canViewMaterials
    ? listMaterials(accessToken, { page: 1, limit: 1, isActive: true, sortBy: "code", sortOrder: "asc" })
    : Promise.resolve(null);
  const receivingPromise = canViewStock
    ? listMaterialsReceiving(accessToken, {
        page: 1,
        limit: 6,
        sortBy: "receiveDate",
        sortOrder: "desc",
      })
    : Promise.resolve(null);

  const [inventoryPages, materialList, receivingList] = await Promise.all([
    inventoryPromise,
    materialListPromise,
    receivingPromise,
  ]);

  const inventorySummary = inventoryPages?.[0].summary ?? null;
  const criticalMaterials = inventoryPages
    ? [...inventoryPages[0].items, ...inventoryPages[1].items].slice(0, 6)
    : [];

  return (
    <MaterialsDashboardView
      inventorySummary={inventorySummary}
      materialTotal={inventorySummary?.total ?? materialList?.meta.totalItems ?? 0}
      criticalMaterials={criticalMaterials}
      recentReceivings={receivingList?.items ?? []}
      receivingTotal={receivingList?.meta.totalItems ?? null}
      canViewMaterials={canViewMaterials}
      canViewStock={canViewStock}
      canCreateReceiving={canViewStock && (session.user.isSuperAdmin || session.permissions.includes("MATERIALS_RECEIVING_CREATE"))}
    />
  );
}
