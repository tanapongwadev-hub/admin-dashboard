import type { DisbursementStatus, DisbursementType, MaterialsDisbursementLookups } from "@/lib/api/materials-disbursement";

// Canonical filter state for /materials/materials-disbursement — same
// architecture as /materials/pc and /materials/materials-receiving (see
// AGENTS.md § Materials PC advanced filter redesign): one typed object
// every filter control reads from, every key mapping 1:1 to a real URL
// param AND a real cps-api ListMaterialsDisbursementParams field. As of
// 2026-09-20 this page has the same quick-bar + staged Advanced Filters
// drawer split as Materials Receiving (see AGENTS.md § Material
// Disbursement filter redesign) — quick bar covers search/status/type,
// the drawer additionally covers material + the date range.

export type MaterialsDisbursementStatusFilter = "all" | DisbursementStatus;
export type MaterialsDisbursementTypeFilter = "all" | DisbursementType;

export interface MaterialsDisbursementFilterState {
  search: string;
  status: MaterialsDisbursementStatusFilter;
  disbursementType: MaterialsDisbursementTypeFilter;
  materialId: string;
  // Disbursement-date range — same shape as Materials Receiving's own
  // receiveDateFrom/receiveDateTo, real cps-api ListMaterialsDisbursementParams
  // fields (already supported server-side before this filter existed here).
  disbursementDateFrom: string;
  disbursementDateTo: string;
}

export const MATERIALS_DISBURSEMENT_FILTER_KEYS: (keyof MaterialsDisbursementFilterState)[] = [
  "search",
  "status",
  "disbursementType",
  "materialId",
  "disbursementDateFrom",
  "disbursementDateTo",
];

// Fields that only ever live in the Advanced Filters drawer (never a quick
// dropdown) — drives the drawer trigger's active-filter-count badge, same
// role as MATERIALS_RECEIVING_ADVANCED_ONLY_KEYS.
export const MATERIALS_DISBURSEMENT_ADVANCED_ONLY_KEYS: (keyof MaterialsDisbursementFilterState)[] = [
  "materialId",
  "disbursementDateFrom",
  "disbursementDateTo",
];

// `lookups` is optional and used only to resolve a `?materialCode=` URL
// param (set by /materials/pc's "รายการจ่ายออก" row action) into this
// state's `materialId` field — same resolution pattern as
// lib/filters/materials-receiving-filters.ts#readMaterialsReceivingFilters.
export function readMaterialsDisbursementFilters(
  searchParams: URLSearchParams,
  lookups?: MaterialsDisbursementLookups
): MaterialsDisbursementFilterState {
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
    disbursementType: asType(searchParams.get("disbursementType")),
    materialId,
    disbursementDateFrom: searchParams.get("disbursementDateFrom") ?? "",
    disbursementDateTo: searchParams.get("disbursementDateTo") ?? "",
  };
}

function asStatus(value: string | null): MaterialsDisbursementStatusFilter {
  return value === "draft" || value === "confirmed" || value === "cancelled" ? value : "all";
}

function asType(value: string | null): MaterialsDisbursementTypeFilter {
  return value === "stock_cut" || value === "production" ? value : "all";
}

export interface MaterialsDisbursementFilterChip {
  key: keyof MaterialsDisbursementFilterState;
  label: string;
}

const STATUS_LABELS: Record<DisbursementStatus, string> = {
  draft: "ร่าง",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิก",
};

const TYPE_LABELS: Record<DisbursementType, string> = {
  stock_cut: "ตัดสต็อก",
  production: "เบิกเพื่อผลิต",
};

function formatChipDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function buildMaterialsDisbursementChips(
  filters: MaterialsDisbursementFilterState,
  lookups: MaterialsDisbursementLookups
): MaterialsDisbursementFilterChip[] {
  const chips: MaterialsDisbursementFilterChip[] = [];
  if (filters.status !== "all") chips.push({ key: "status", label: `สถานะ: ${STATUS_LABELS[filters.status]}` });
  if (filters.disbursementType !== "all") {
    chips.push({ key: "disbursementType", label: `ประเภท: ${TYPE_LABELS[filters.disbursementType]}` });
  }
  if (filters.materialId) {
    const material = lookups.materials.find((item) => item.id === filters.materialId);
    const label = material ? `${material.code} · ${material.name}` : filters.materialId;
    chips.push({ key: "materialId", label: `วัสดุ: ${label}` });
  }
  if (filters.disbursementDateFrom || filters.disbursementDateTo) {
    const from = filters.disbursementDateFrom ? formatChipDate(filters.disbursementDateFrom) : "…";
    const to = filters.disbursementDateTo ? formatChipDate(filters.disbursementDateTo) : "…";
    // One combined chip for the date range (removing it clears both ends at
    // once, same as Materials Receiving's own receiveDateFrom chip) — a
    // single-key clear would leave a dangling one-sided range.
    chips.push({ key: "disbursementDateFrom", label: `วันที่จ่ายออก: ${from} – ${to}` });
  }
  return chips;
}
