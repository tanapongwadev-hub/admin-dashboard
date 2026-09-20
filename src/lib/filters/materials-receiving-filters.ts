import type { MaterialReceivingLookups, MaterialReceivingStatus } from "@/lib/api/materials-receiving";

// Canonical filter state for /materials/materials-receiving — same
// architecture as /materials/pc (see AGENTS.md § Materials PC advanced
// filter redesign): one typed object every filter control reads from and
// writes to, with every key mapping 1:1 to a real URL param AND a real
// cps-api ListMaterialsReceivingParams param (lib/api/materials-receiving.ts)
// — no fabricated Lot Number/QR Code text filter here, since search already
// matches Internal Lot/Supplier Lot/material code server-side.

export type MaterialsReceivingStatusFilter = "all" | MaterialReceivingStatus;

export interface MaterialsReceivingFilterState {
  search: string;
  status: MaterialsReceivingStatusFilter;
  supplierId: string;
  materialId: string;
  receiveDateFrom: string;
  receiveDateTo: string;
}

export const MATERIALS_RECEIVING_FILTER_DEFAULTS: MaterialsReceivingFilterState = {
  search: "",
  status: "all",
  supplierId: "",
  materialId: "",
  receiveDateFrom: "",
  receiveDateTo: "",
};

// Fields that only ever live in the Advanced Filters drawer (never a quick
// dropdown) — drives the drawer trigger's active-filter-count badge.
export const MATERIALS_RECEIVING_ADVANCED_ONLY_KEYS: (keyof MaterialsReceivingFilterState)[] = [
  "supplierId",
  "materialId",
  "receiveDateFrom",
  "receiveDateTo",
];

export const MATERIALS_RECEIVING_ALL_FILTER_KEYS: (keyof MaterialsReceivingFilterState)[] = [
  "search",
  "status",
  "supplierId",
  "materialId",
  "receiveDateFrom",
  "receiveDateTo",
];

// `lookups` is optional and used only to resolve a `?materialCode=` URL
// param (set by /materials/pc's "รายการรับเข้า"/"รับเข้า" row actions, see
// materials/materials-receiving/page.tsx) into this state's `materialId`
// field when `?materialId=` itself isn't present — so the material chip
// and the advanced-filter drawer's own Material select reflect the same
// filter that page.tsx already resolved and applied server-side, instead
// of only working "invisibly" (results filtered, but no chip/pre-selection
// to show it). `materialId` in the URL still wins if both are present.
export function readMaterialsReceivingFilters(
  searchParams: URLSearchParams,
  lookups?: MaterialReceivingLookups
): MaterialsReceivingFilterState {
  const materialId =
    searchParams.get("materialId") ??
    (() => {
      const code = searchParams.get("materialCode");
      if (!code) return null;
      const match = lookups?.materials.find((m) => m.code.toLowerCase() === code.toLowerCase());
      return match?.id ?? null;
    })() ??
    "";
  return {
    search: searchParams.get("search") ?? "",
    status: asStatus(searchParams.get("status")),
    supplierId: searchParams.get("supplierId") ?? "",
    materialId,
    receiveDateFrom: searchParams.get("receiveDateFrom") ?? "",
    receiveDateTo: searchParams.get("receiveDateTo") ?? "",
  };
}

function asStatus(value: string | null): MaterialsReceivingStatusFilter {
  return value === "draft" || value === "confirmed" || value === "cancelled" ? value : "all";
}

export interface MaterialsReceivingFilterChip {
  key: keyof MaterialsReceivingFilterState;
  label: string;
}

const STATUS_LABELS: Record<MaterialReceivingStatus, string> = {
  draft: "ร่าง",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิก",
};

function lookupLabel(item: { code: string; nameTh?: string; nameEn?: string | null } | undefined): string | undefined {
  if (!item) return undefined;
  return item.nameEn ?? item.nameTh ?? item.code;
}

function formatChipDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

// Builds the removable chip row shown under the filter bar. Every chip maps
// back to exactly one MaterialsReceivingFilterState key.
export function buildMaterialsReceivingChips(
  filters: MaterialsReceivingFilterState,
  lookups: MaterialReceivingLookups
): MaterialsReceivingFilterChip[] {
  const chips: MaterialsReceivingFilterChip[] = [];
  if (filters.status !== "all") chips.push({ key: "status", label: `สถานะ: ${STATUS_LABELS[filters.status]}` });
  if (filters.supplierId) {
    const label = lookupLabel(lookups.suppliers.find((item) => item.id === filters.supplierId));
    chips.push({ key: "supplierId", label: `ซัพพลายเออร์: ${label ?? filters.supplierId}` });
  }
  if (filters.materialId) {
    const material = lookups.materials.find((item) => item.id === filters.materialId);
    const label = material ? `${material.code} · ${material.name}` : filters.materialId;
    chips.push({ key: "materialId", label: `วัสดุ: ${label}` });
  }
  if (filters.receiveDateFrom || filters.receiveDateTo) {
    const from = filters.receiveDateFrom ? formatChipDate(filters.receiveDateFrom) : "…";
    const to = filters.receiveDateTo ? formatChipDate(filters.receiveDateTo) : "…";
    // One combined chip for the date range (removing it clears both ends at
    // once) — split from/to into two separate chips would let a user end up
    // with a dangling one-sided range that reads confusingly.
    chips.push({ key: "receiveDateFrom", label: `วันที่รับเข้า: ${from} – ${to}` });
  }
  return chips;
}
