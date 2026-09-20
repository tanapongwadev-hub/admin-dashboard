import type { MaterialLookups, MaterialStockStatus, MaterialType } from "@/lib/api/materials";

// Canonical filter state for /materials/pc — the single object every piece
// of the filter UI (quick bar, chips, advanced drawer) reads from and writes
// to, instead of each control re-deriving its own slice of `searchParams`.
// Every key here maps 1:1 to a real URL query param AND a real cps-api
// query param (see lib/api/materials.ts#ListMaterialInventoryParams /
// ListMaterialsParams) — no field exists here that the backend can't
// actually filter on. See AGENTS.md § Materials PC advanced filter redesign
// for why fields like Lot Number/QR Code/stock qty min-max/receive date
// (asked for in the original enterprise-filter spec) were deliberately
// left out: they don't exist on the Material entity at all.

export type MaterialPcStatusFilter = "all" | "active" | "inactive";
export type MaterialPcTypeFilter = "all" | MaterialType;
export type MaterialPcStockStatusFilter = "all" | MaterialStockStatus;

export interface MaterialPcFilterState {
  search: string;
  status: MaterialPcStatusFilter;
  type: MaterialPcTypeFilter;
  stockStatus: MaterialPcStockStatusFilter;
  supplierId: string;
  modelId: string;
  loadingPointId: string;
  processLineName: string;
}

export const MATERIAL_PC_FILTER_DEFAULTS: MaterialPcFilterState = {
  search: "",
  status: "all",
  type: "all",
  stockStatus: "all",
  supplierId: "",
  modelId: "",
  loadingPointId: "",
  processLineName: "",
};

// Fields that only ever live in the Advanced Filters drawer (never a quick
// dropdown) — used for the drawer trigger's active-filter-count badge, and
// as the set the drawer's own "Reset" button clears.
export const MATERIAL_PC_ADVANCED_ONLY_KEYS: (keyof MaterialPcFilterState)[] = [
  "supplierId",
  "modelId",
  "processLineName",
];

export function readMaterialPcFilters(searchParams: URLSearchParams): MaterialPcFilterState {
  return {
    search: searchParams.get("search") ?? "",
    status: asStatus(searchParams.get("status")),
    type: asType(searchParams.get("type")),
    stockStatus: asStockStatus(searchParams.get("stockStatus")),
    supplierId: searchParams.get("supplierId") ?? "",
    modelId: searchParams.get("modelId") ?? "",
    loadingPointId: searchParams.get("loadingPointId") ?? "",
    processLineName: searchParams.get("processLineName") ?? "",
  };
}

function asStatus(value: string | null): MaterialPcStatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}
function asType(value: string | null): MaterialPcTypeFilter {
  return value === "PC" || value === "OF" || value === "OF_MAT" ? value : "all";
}
function asStockStatus(value: string | null): MaterialPcStockStatusFilter {
  return value === "NORMAL" || value === "LOW_STOCK" || value === "OUT_OF_STOCK" ? value : "all";
}

export interface MaterialPcFilterChip {
  key: keyof MaterialPcFilterState;
  label: string;
}

const STATUS_LABELS: Record<Exclude<MaterialPcStatusFilter, "all">, string> = {
  active: "ใช้งาน",
  inactive: "ไม่ใช้งาน",
};
const STOCK_STATUS_LABELS: Record<Exclude<MaterialPcStockStatusFilter, "all">, string> = {
  NORMAL: "สต็อกปกติ",
  LOW_STOCK: "สต็อกต่ำ",
  OUT_OF_STOCK: "หมดสต็อก",
};

function lookupLabel(item: { code: string; nameTh?: string; nameEn?: string } | undefined): string | undefined {
  if (!item) return undefined;
  return item.nameEn ?? item.nameTh ?? item.code;
}

// Builds the removable chip row shown under the filter bar. Every chip maps
// back to exactly one MaterialPcFilterState key, so removing a chip is
// always "clear that one key" — see material-pc-filters.tsx's onRemoveChip.
export function buildMaterialPcChips(
  filters: MaterialPcFilterState,
  lookups: MaterialLookups
): MaterialPcFilterChip[] {
  const chips: MaterialPcFilterChip[] = [];
  if (filters.status !== "all") chips.push({ key: "status", label: `สถานะ: ${STATUS_LABELS[filters.status]}` });
  if (filters.type !== "all") {
    chips.push({ key: "type", label: `ประเภท: ${filters.type === "OF_MAT" ? "OF-MAT" : filters.type}` });
  }
  if (filters.stockStatus !== "all") {
    chips.push({ key: "stockStatus", label: `สต็อก: ${STOCK_STATUS_LABELS[filters.stockStatus]}` });
  }
  if (filters.loadingPointId) {
    const label = lookupLabel(lookups.loadingPoints.find((item) => item.id === filters.loadingPointId));
    chips.push({ key: "loadingPointId", label: `ตำแหน่ง: ${label ?? filters.loadingPointId}` });
  }
  if (filters.supplierId) {
    const label = lookupLabel(lookups.suppliers.find((item) => item.id === filters.supplierId));
    chips.push({ key: "supplierId", label: `ซัพพลายเออร์: ${label ?? filters.supplierId}` });
  }
  if (filters.modelId) {
    const label = lookupLabel(lookups.models.find((item) => item.id === filters.modelId));
    chips.push({ key: "modelId", label: `รุ่น: ${label ?? filters.modelId}` });
  }
  if (filters.processLineName) {
    chips.push({ key: "processLineName", label: `สายการผลิต: ${filters.processLineName}` });
  }
  return chips;
}

export const MATERIAL_PC_ALL_FILTER_KEYS: (keyof MaterialPcFilterState)[] = [
  "search",
  "status",
  "type",
  "stockStatus",
  "supplierId",
  "modelId",
  "loadingPointId",
  "processLineName",
];
