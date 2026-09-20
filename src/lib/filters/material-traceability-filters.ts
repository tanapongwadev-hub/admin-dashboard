import type { ListMaterialTraceabilityParams, StockTransactionType } from "@/lib/api/material-traceability";

// Canonical filter state for /materials/materials-report — same "one
// typed object every control reads from" architecture as /materials/pc and
// /materials/materials-receiving (see admin-dashboard AGENTS.md § Materials
// PC advanced filter redesign, and R4's "every filtered table uses this
// pattern" rule). Every key maps 1:1 to a real URL param AND a real
// cps-api QueryMaterialTraceabilityDto param
// (cps-api/src/modules/material-traceability/dto/query-material-traceability.dto.ts)
// — this is also the exact query string the CSV/Excel/PDF export buttons
// re-issue, so a filtered screen and its export can never disagree.

export interface MaterialTraceabilityFilterState {
  dateFrom: string;
  dateTo: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialType: string;
  shape: string;
  internalLotNo: string;
  supplierLotNo: string;
  mainQr: string;
  subQr: string;
  transactionType: StockTransactionType | "";
  receivingNo: string;
  disbursementNo: string;
  supplierId: string;
  departmentId: string;
  productionOrder: string;
  referenceNo: string;
  operator: string;
  status: string;
}

export const MATERIAL_TRACEABILITY_FILTER_DEFAULTS: MaterialTraceabilityFilterState = {
  dateFrom: "",
  dateTo: "",
  materialId: "",
  materialCode: "",
  materialName: "",
  materialType: "",
  shape: "",
  internalLotNo: "",
  supplierLotNo: "",
  mainQr: "",
  subQr: "",
  transactionType: "",
  receivingNo: "",
  disbursementNo: "",
  supplierId: "",
  departmentId: "",
  productionOrder: "",
  referenceNo: "",
  operator: "",
  status: "",
};

// Fields exposed on the quick bar (always visible at md:+) — the rest only
// ever live in the Advanced Filters drawer.
export const MATERIAL_TRACEABILITY_QUICK_KEYS: (keyof MaterialTraceabilityFilterState)[] = [
  "materialCode",
  "transactionType",
];

export const MATERIAL_TRACEABILITY_ADVANCED_ONLY_KEYS: (keyof MaterialTraceabilityFilterState)[] = [
  "dateFrom",
  "materialName",
  "materialType",
  "shape",
  "internalLotNo",
  "supplierLotNo",
  "mainQr",
  "subQr",
  "receivingNo",
  "disbursementNo",
  "supplierId",
  "departmentId",
  "productionOrder",
  "referenceNo",
  "operator",
  "status",
];

export const MATERIAL_TRACEABILITY_ALL_FILTER_KEYS: (keyof MaterialTraceabilityFilterState)[] = [
  "dateFrom",
  "dateTo",
  "materialId",
  "materialCode",
  "materialName",
  "materialType",
  "shape",
  "internalLotNo",
  "supplierLotNo",
  "mainQr",
  "subQr",
  "transactionType",
  "receivingNo",
  "disbursementNo",
  "supplierId",
  "departmentId",
  "productionOrder",
  "referenceNo",
  "operator",
  "status",
];

export function readMaterialTraceabilityFilters(searchParams: URLSearchParams): MaterialTraceabilityFilterState {
  const state = { ...MATERIAL_TRACEABILITY_FILTER_DEFAULTS };
  for (const key of MATERIAL_TRACEABILITY_ALL_FILTER_KEYS) {
    const value = searchParams.get(key);
    if (value) (state as Record<string, string>)[key] = value;
  }
  return state;
}

export function filtersToParams(filters: MaterialTraceabilityFilterState): ListMaterialTraceabilityParams {
  return {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    materialId: filters.materialId || undefined,
    materialCode: filters.materialCode || undefined,
    materialName: filters.materialName || undefined,
    materialType: filters.materialType || undefined,
    shape: filters.shape || undefined,
    internalLotNo: filters.internalLotNo || undefined,
    supplierLotNo: filters.supplierLotNo || undefined,
    mainQr: filters.mainQr || undefined,
    subQr: filters.subQr || undefined,
    transactionType: filters.transactionType || undefined,
    receivingNo: filters.receivingNo || undefined,
    disbursementNo: filters.disbursementNo || undefined,
    supplierId: filters.supplierId || undefined,
    departmentId: filters.departmentId || undefined,
    productionOrder: filters.productionOrder || undefined,
    referenceNo: filters.referenceNo || undefined,
    operator: filters.operator || undefined,
    status: filters.status || undefined,
  };
}

export interface MaterialTraceabilityFilterChip {
  key: keyof MaterialTraceabilityFilterState;
  label: string;
}

export const TRANSACTION_TYPE_LABELS: Record<StockTransactionType, string> = {
  RECEIVE: "รับเข้า",
  ISSUE: "จ่ายออก",
  RETURN: "คืน",
  ADJUST_IN: "ปรับเพิ่ม",
  ADJUST_OUT: "ปรับลด",
  TRANSFER_IN: "โอนเข้า",
  TRANSFER_OUT: "โอนออก",
  CANCEL: "ยกเลิก/คืนกลับ",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "ร่าง",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิก",
};

function formatChipDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

// Builds the removable chip row. Every chip maps back to exactly one
// MaterialTraceabilityFilterState key (see removeChip in the filter bar,
// which special-cases the combined date-range chip the same way
// materials-receiving-filters.ts does).
export function buildMaterialTraceabilityChips(filters: MaterialTraceabilityFilterState): MaterialTraceabilityFilterChip[] {
  const chips: MaterialTraceabilityFilterChip[] = [];
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? formatChipDate(filters.dateFrom) : "…";
    const to = filters.dateTo ? formatChipDate(filters.dateTo) : "…";
    chips.push({ key: "dateFrom", label: `วันที่: ${from} – ${to}` });
  }
  if (filters.materialCode) chips.push({ key: "materialCode", label: `รหัสวัสดุ: ${filters.materialCode}` });
  if (filters.materialName) chips.push({ key: "materialName", label: `ชื่อวัสดุ: ${filters.materialName}` });
  if (filters.materialType) chips.push({ key: "materialType", label: `ประเภทวัสดุ: ${filters.materialType}` });
  if (filters.shape) chips.push({ key: "shape", label: `รูปทรง: ${filters.shape}` });
  if (filters.internalLotNo) chips.push({ key: "internalLotNo", label: `Internal Lot: ${filters.internalLotNo}` });
  if (filters.supplierLotNo) chips.push({ key: "supplierLotNo", label: `Supplier Lot: ${filters.supplierLotNo}` });
  if (filters.mainQr) chips.push({ key: "mainQr", label: `MAIN QR: ${filters.mainQr}` });
  if (filters.subQr) chips.push({ key: "subQr", label: `SUB QR: ${filters.subQr}` });
  if (filters.transactionType) {
    chips.push({ key: "transactionType", label: `ประเภทรายการ: ${TRANSACTION_TYPE_LABELS[filters.transactionType]}` });
  }
  if (filters.receivingNo) chips.push({ key: "receivingNo", label: `เลขที่รับเข้า: ${filters.receivingNo}` });
  if (filters.disbursementNo) chips.push({ key: "disbursementNo", label: `เลขที่จ่ายออก: ${filters.disbursementNo}` });
  if (filters.supplierId) chips.push({ key: "supplierId", label: `ซัพพลายเออร์: ${filters.supplierId}` });
  if (filters.departmentId) chips.push({ key: "departmentId", label: `แผนก: ${filters.departmentId}` });
  if (filters.productionOrder) chips.push({ key: "productionOrder", label: `Production Order: ${filters.productionOrder}` });
  if (filters.referenceNo) chips.push({ key: "referenceNo", label: `เอกสารอ้างอิง: ${filters.referenceNo}` });
  if (filters.operator) chips.push({ key: "operator", label: `ผู้ปฏิบัติงาน: ${filters.operator}` });
  if (filters.status) chips.push({ key: "status", label: `สถานะ: ${STATUS_LABELS[filters.status] ?? filters.status}` });
  return chips;
}
