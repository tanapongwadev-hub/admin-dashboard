import type { ProductLookups } from "@/lib/api/products";

// Canonical filter state for /products and /products/list — same
// architecture as /materials/pc and /materials/materials-receiving (see
// AGENTS.md § Materials PC advanced filter redesign / R4): one typed object
// every filter control reads from and writes to, with every key mapping 1:1
// to a real URL param AND a real cps-api ListProductsParams param
// (lib/api/products.ts). No fabricated fields — Products has no
// page/limit on its list endpoint, so this state deliberately has no page
// key either.

export type ProductsStatusFilter = "all" | "active" | "inactive";

export interface ProductsFilterState {
  search: string;
  status: ProductsStatusFilter;
  productTypeId: string;
  customerId: string;
  modelId: string;
  locationId: string;
  processLineId: string;
}

export const PRODUCTS_FILTER_DEFAULTS: ProductsFilterState = {
  search: "",
  status: "all",
  productTypeId: "",
  customerId: "",
  modelId: "",
  locationId: "",
  processLineId: "",
};

// Fields that only ever live in the Advanced Filters drawer (never a quick
// dropdown) — drives the drawer trigger's active-filter-count badge.
export const PRODUCTS_ADVANCED_ONLY_KEYS: (keyof ProductsFilterState)[] = [
  "customerId",
  "modelId",
  "locationId",
  "processLineId",
];

export const PRODUCTS_ALL_FILTER_KEYS: (keyof ProductsFilterState)[] = [
  "search",
  "status",
  "productTypeId",
  "customerId",
  "modelId",
  "locationId",
  "processLineId",
];

export function readProductsFilters(searchParams: URLSearchParams): ProductsFilterState {
  return {
    search: searchParams.get("search") ?? "",
    status: asStatus(searchParams.get("status")),
    productTypeId: searchParams.get("productTypeId") ?? "",
    customerId: searchParams.get("customerId") ?? "",
    modelId: searchParams.get("modelId") ?? "",
    locationId: searchParams.get("locationId") ?? "",
    processLineId: searchParams.get("processLineId") ?? "",
  };
}

function asStatus(value: string | null): ProductsStatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

export interface ProductsFilterChip {
  key: keyof ProductsFilterState;
  label: string;
}

const STATUS_LABELS: Record<Exclude<ProductsStatusFilter, "all">, string> = {
  active: "ใช้งาน",
  inactive: "ไม่ใช้งาน",
};

function lookupLabel(item: ProductLookups["customers"][number] | undefined): string | undefined {
  if (!item) return undefined;
  return item.nameEn ?? item.nameTh ?? item.code;
}

// Builds the removable chip row shown under the filter bar. Every chip maps
// back to exactly one ProductsFilterState key.
export function buildProductsChips(filters: ProductsFilterState, lookups: ProductLookups): ProductsFilterChip[] {
  const chips: ProductsFilterChip[] = [];
  if (filters.status !== "all") chips.push({ key: "status", label: `สถานะ: ${STATUS_LABELS[filters.status]}` });
  if (filters.productTypeId) {
    const label = lookupLabel(lookups.productTypes.find((item) => item.id === filters.productTypeId));
    chips.push({ key: "productTypeId", label: `ประเภทสินค้า: ${label ?? filters.productTypeId}` });
  }
  if (filters.customerId) {
    const label = lookupLabel(lookups.customers.find((item) => item.id === filters.customerId));
    chips.push({ key: "customerId", label: `ลูกค้า: ${label ?? filters.customerId}` });
  }
  if (filters.modelId) {
    const label = lookupLabel(lookups.productModels.find((item) => item.id === filters.modelId));
    chips.push({ key: "modelId", label: `รุ่น: ${label ?? filters.modelId}` });
  }
  if (filters.locationId) {
    const label = lookupLabel(lookups.locations.find((item) => item.id === filters.locationId));
    chips.push({ key: "locationId", label: `สถานที่: ${label ?? filters.locationId}` });
  }
  if (filters.processLineId) {
    const label = lookupLabel(lookups.processLines.find((item) => item.id === filters.processLineId));
    chips.push({ key: "processLineId", label: `สายการผลิต: ${label ?? filters.processLineId}` });
  }
  return chips;
}
