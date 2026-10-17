import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import {
  listMaterials,
  getMaterialLookups,
  listMaterialInventory,
  listStockBalances,
  type MaterialStockStatus,
  type MaterialType,
  type StockBalance,
  type ListMaterialInventoryParams,
  type ListMaterialsParams,
} from "@/lib/api/materials";
import { MaterialPcClient } from "@/components/materials-pc/material-pc-client";
import { listMaterialIdsWithBom } from "@/lib/api/engineering";

const PAGE_SIZES = new Set([20, 40, 60]);
// PIPE/SHEET/COIL are raw source materials (Material main). They are listed only
// in the Pipe / Sheet / Coil tab; their processed outputs stay in the normal tab.
const RAW_SHAPES = new Set(["PIPE", "SHEET", "COIL"]);

export default async function MaterialsPcPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    stockStatus?: string;
    type?: string;
    supplierId?: string;
    modelId?: string;
    loadingPointId?: string;
    processLineName?: string;
    sortBy?: string;
    sortOrder?: string;
    tab?: string;
    edit?: string;
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
  const canViewBom = session.user.isSuperAdmin || session.permissions.includes("MATERIAL_BOMS_VIEW");
  const activeTab = params.tab === "raw" ? "raw" : params.tab === "bom" ? "bom" : "all";
  const page = Math.max(1, Number(params.page) || 1);
  const requestedLimit = Number(params.limit);
  const limit = PAGE_SIZES.has(requestedLimit) ? requestedLimit : 20;
  const search = params.search?.trim() || undefined;
  // Active materials are the default view. `status=all` is explicit so a
  // missing status can keep meaning "active" without removing the user's
  // ability to inspect inactive and active rows together.
  const isActive = params.status === "inactive" ? false : params.status === "all" ? undefined : true;
  // No longer hardcoded to "PC" — this page now shows every material type
  // (PC/OF/OF_MAT) by default, and the type filter narrows it. See
  // AGENTS.md § Materials PC — "แสดงทุก active แต่แยกที่ตัวกรอง".
  const materialTypes = new Set<MaterialType>(["PC", "OF", "OF_MAT"]);
  const type = materialTypes.has(params.type as MaterialType) ? (params.type as MaterialType) : undefined;

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
  const inventorySorts = new Set(["code", "name", "currentStock", "lastReceivedAt", "createdAt"]);
  const sortBy = inventorySorts.has(params.sortBy ?? "") ? params.sortBy as "code" | "name" | "currentStock" | "lastReceivedAt" | "createdAt" : "createdAt";
  const sortOrder: "asc" | "desc" = params.sortOrder === "asc" ? "asc" : "desc";

  const inventoryQuery: ListMaterialInventoryParams = { search, isActive, type, stockStatus, supplierId: params.supplierId, modelId: params.modelId, loadingPointId: params.loadingPointId, processLineName: params.processLineName, sortBy, sortOrder };
  const materialQuery: ListMaterialsParams = { search, isActive, type, supplierId: params.supplierId, modelId: params.modelId, loadingPointId: params.loadingPointId, sortBy: sortBy === "name" ? "name" : sortBy === "createdAt" ? "createdAt" : "code", sortOrder };
  const [lookups, inventory, materialList, balances, bomMaterialIds] = await Promise.all([
    getMaterialLookups(accessToken),
    canViewStock
      ? listMaterialInventory(accessToken, {
          page: 1,
          limit: 100,
          search,
          isActive,
          type,
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
          page: 1,
          limit: 100,
          search,
          isActive,
          type,
          supplierId: params.supplierId,
          modelId: params.modelId,
          loadingPointId: params.loadingPointId,
          sortBy: sortBy === "name" ? "name" : sortBy === "createdAt" ? "createdAt" : "code",
          sortOrder,
        })
      : Promise.resolve(null),
    canViewStock ? listStockBalances(accessToken) : Promise.resolve(null),
    canViewBom ? listMaterialIdsWithBom(accessToken) : Promise.resolve([]),
  ]);

  const list = inventory ?? materialList!;
  const matches = [...list.items];
  // Bound concurrent requests while collecting all matches, so a pair cannot
  // be split by item pagination or by a filter matching only its sub material.
  for (let nextPage = 2; nextPage <= list.meta.totalPages; nextPage += 4) {
    const pages = await Promise.all(Array.from({ length: Math.min(4, list.meta.totalPages - nextPage + 1) }, (_, index) =>
      canViewStock
        ? listMaterialInventory(accessToken, { ...inventoryQuery, page: nextPage + index, limit: 100 })
        : listMaterials(accessToken, { ...materialQuery, page: nextPage + index, limit: 100 })
    ));
    matches.push(...pages.flatMap((result) => result.items));
  }
  const rawMatches = matches.filter((material) => RAW_SHAPES.has(material.materialType));
  const normalMatches = matches.filter((material) => !RAW_SHAPES.has(material.materialType));
  const bomIds = new Set(bomMaterialIds);
  const bomMatches = matches.filter((material) => bomIds.has(material.id));
  const tabRows = activeTab === "bom" ? bomMatches : activeTab === "raw" ? rawMatches : normalMatches;
  const totalItems = tabRows.length;
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const displayedMaterials = tabRows.slice((currentPage - 1) * limit, currentPage * limit);
  const groupedMeta = { page: currentPage, limit, totalItems, totalPages };
  const stockByMaterialId = balances
    ? Object.fromEntries(balances.map((balance) => [balance.materialId, balance])) as Record<string, StockBalance>
    : null;
  if (stockByMaterialId) {
    for (const material of matches) {
      if ("currentStock" in material && typeof material.currentStock === "string") {
        stockByMaterialId[material.id] = {
          materialId: material.id, materialCode: material.code, materialName: material.name,
          quantity: material.currentStock, unitCode: material.unit?.code ?? "", unitNameTh: material.unit?.nameTh ?? "",
          lastMovementAt: "lastMovementAt" in material && typeof material.lastMovementAt === "string" ? material.lastMovementAt : null,
          lastReceivedAt: "lastReceivedAt" in material && typeof material.lastReceivedAt === "string" ? material.lastReceivedAt : null,
        };
      }
    }
  }

  const canEdit = session.user.isSuperAdmin || session.permissions.includes("MATERIAL_CREATE") || session.permissions.includes("MATERIAL_UPDATE");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("MATERIAL_DELETE");
  // ?edit=<id> (e.g. from Material Receiving when a Material has no supplier)
  // opens that Material's edit dialog once.
  const initialEditMaterial = canEdit && params.edit ? matches.find((material) => material.id === params.edit) ?? null : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">จัดการวัสดุ</h1>
        <p className="mt-1 text-sm text-fg-muted">ควบคุมข้อมูลวัสดุทุกประเภท (PC/OF/OF-MAT) ยอดคงเหลือ และการรับเข้าชิ้นส่วนสำหรับคลังและสายการผลิต</p>
      </div>

      <MaterialPcClient
        materials={displayedMaterials}
        meta={groupedMeta}
        lookups={lookups}
        canEdit={canEdit}
        canDelete={canDelete}
        stockByMaterialId={stockByMaterialId}
        canViewStock={canViewStock}
        activeTab={activeTab}
        tabCounts={{ all: normalMatches.length, raw: rawMatches.length, bom: bomMatches.length }}
        canViewBom={canViewBom}
        bomMaterialIds={bomMaterialIds}
        initialEditMaterial={initialEditMaterial}
      />
    </div>
  );
}

export const metadata: Metadata = { title: "จัดการวัสดุ" };
