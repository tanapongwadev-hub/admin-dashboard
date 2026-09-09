import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import {
  listMaterials,
  getMaterialLookups,
  listMaterialInventory,
  type MaterialStockStatus,
  type StockBalance,
} from "@/lib/api/materials";
import { MaterialPcClient } from "@/components/materials-pc/material-pc-client";

const PAGE_SIZES = new Set([20, 40, 60]);

export default async function MaterialsPcPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    stockStatus?: string;
    supplierId?: string;
    modelId?: string;
    loadingPointId?: string;
    processLineName?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const session = await getCurrentSession();
  const canView = !!session && (session.user.isSuperAdmin || session.permissions.includes("MATERIAL_VIEW"));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้าวัสดุ</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดูวัสดุต้องมีสิทธิ์ Material View กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const requestedLimit = Number(params.limit);
  const limit = PAGE_SIZES.has(requestedLimit) ? requestedLimit : 20;
  const search = params.search?.trim() || undefined;
  const isActive = params.status === "active" ? true : params.status === "inactive" ? false : undefined;

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;

  // Stock quantity is a separate cps-api resource (`/stock-balances`) gated
  // on MATERIALS_RECEIVING_VIEW, not MATERIAL_VIEW — a user can see the
  // materials list without being able to see stock, so this is optional and
  // only fetched when permitted (see AGENTS.md § Materials PC).
  const canViewStock = session.user.isSuperAdmin || session.permissions.includes("MATERIALS_RECEIVING_VIEW");

  const stockStatuses = new Set<MaterialStockStatus>(["NORMAL", "LOW_STOCK", "OUT_OF_STOCK"]);
  const stockStatus = stockStatuses.has(params.stockStatus as MaterialStockStatus)
    ? (params.stockStatus as MaterialStockStatus)
    : undefined;
  const inventorySorts = new Set(["code", "name", "currentStock", "lastReceivedAt"]);
  const sortBy = inventorySorts.has(params.sortBy ?? "") ? params.sortBy as "code" | "name" | "currentStock" | "lastReceivedAt" : "code";
  const sortOrder = params.sortOrder === "desc" ? "desc" : "asc";

  const [lookups, inventory, materialList] = await Promise.all([
    getMaterialLookups(accessToken),
    canViewStock
      ? listMaterialInventory(accessToken, {
          page,
          limit,
          search,
          isActive,
          type: "PC",
          stockStatus,
          supplierId: params.supplierId,
          modelId: params.modelId,
          loadingPointId: params.loadingPointId,
          processLineName: params.processLineName,
          sortBy,
          sortOrder,
        })
      : Promise.resolve(null),
    !canViewStock
      ? listMaterials(accessToken, {
          page,
          limit,
          search,
          isActive,
          type: "PC",
          supplierId: params.supplierId,
          modelId: params.modelId,
          loadingPointId: params.loadingPointId,
          sortBy: sortBy === "name" ? "name" : "code",
          sortOrder,
        })
      : Promise.resolve(null),
  ]);

  const list = inventory ?? materialList!;
  const stockByMaterialId = inventory
    ? inventory.items.reduce<Record<string, StockBalance>>((map, material) => {
        map[material.id] = {
          materialId: material.id,
          materialCode: material.code,
          materialName: material.name,
          quantity: material.currentStock,
          unitCode: material.unit?.code ?? "",
          unitNameTh: material.unit?.nameTh ?? "",
          lastMovementAt: material.lastMovementAt,
          lastReceivedAt: material.lastReceivedAt,
        };
        return map;
      }, {})
    : null;

  const canEdit = session.user.isSuperAdmin || session.permissions.includes("MATERIAL_CREATE") || session.permissions.includes("MATERIAL_UPDATE");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("MATERIAL_DELETE");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Material / PC Management</h1>
        <p className="mt-1 text-sm text-fg-muted">ควบคุมข้อมูลวัสดุ ยอดคงเหลือ และการรับเข้าชิ้นส่วนสำหรับคลังและสายการผลิต</p>
      </div>

      <MaterialPcClient
        materials={list.items}
        meta={list.meta}
        lookups={lookups}
        canEdit={canEdit}
        canDelete={canDelete}
        stockByMaterialId={stockByMaterialId}
        stockSummary={inventory?.summary ?? null}
        canViewStock={canViewStock}
      />
    </div>
  );
}
