import { apiFetch } from "./client";

// Mirrors cps-api's real `/material-traceability` module — see
// cps-api/API_ENDPOINTS.md § 17 and
// cps-api/src/modules/material-traceability/{material-traceability.controller,material-traceability.service}.ts.
// Read-only reporting over `inventory.stock_transactions` (the source of
// truth) — this file never fabricates a running balance client-side, it
// only renders what the backend already reconciled.

export type StockTransactionType =
  | "RECEIVE"
  | "ISSUE"
  | "RETURN"
  | "ADJUST_IN"
  | "ADJUST_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "CANCEL";

export interface MaterialTraceabilityMovement {
  id: string;
  transactionNo: string;
  traceId: string;
  transactionType: StockTransactionType;
  transactionDate: string;
  referenceType: "MATERIAL_RECEIVING" | "MATERIALS_DISBURSEMENT";
  referenceNo: string | null;
  material: {
    id: string;
    code: string;
    name: string;
    type: string | null;
    shape: string | null;
  };
  internalLotNo: string | null;
  supplierLotNo: string | null;
  mainQr: { id: string; code: string | null } | null;
  subQr: { id: string; code: string | null; boxNo: number | null; status: string | null } | null;
  receiving: { id: string; no: string | null; status: string | null } | null;
  disbursement: { id: string; no: string | null; status: string | null } | null;
  quantityBefore: string;
  movementQty: string;
  quantityIn: string;
  quantityOut: string;
  quantityAfter: string;
  unit: string | null;
  sourceLocationId: string | null;
  destinationLocationId: string | null;
  supplier: { id: string; nameTh: string | null; nameEn: string | null } | null;
  department: { id: string; nameTh: string | null } | null;
  productionOrder: string | null;
  performedBy: { id: string; username: string | null } | null;
  createdAt: string;
  remark: string | null;
  reason: string | null;
}

export interface MaterialReconciliation {
  materialId: string;
  materialCode: string;
  ledgerBalance: string;
  stockBalance: string;
  isMatched: boolean;
}

export interface MaterialTraceabilitySummary {
  receivingCount: number;
  disbursementCount: number;
  totalReceived: string;
  totalIssued: string;
  currentBalance: string;
  lotCount: number;
  mainQrCount: number;
  subQrCount: number;
  activeQrCount: number;
  exhaustedQrCount: number;
  reconciliation: MaterialReconciliation[];
  hasMismatch: boolean;
  reconciliationTruncated: boolean;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface MaterialTraceabilityReport {
  summary: MaterialTraceabilitySummary;
  items: MaterialTraceabilityMovement[];
  meta: PaginatedMeta;
}

export interface MovementSummary {
  id: string;
  transactionNo: string;
  traceId: string;
  transactionType: StockTransactionType;
  transactionDate: string;
  referenceType: string;
  referenceId: string | null;
  referenceNo: string | null;
  mainQrId: string | null;
  subQrId: string | null;
  quantityBefore: string;
  movementQty: string;
  quantityAfter: string;
  performedBy: string | null;
  remark: string | null;
  reason: string | null;
}

export interface MainQrPackage {
  id: string;
  packageNo: number;
  lotDetailNo: string | null;
  initialQuantity: string;
  currentQuantity: string;
  status: string;
}

export interface SubQrIssueHistoryEntry {
  allocationId: string;
  packageId: string;
  disbursedQuantity: string;
  fifoOrder: number | null;
  disbursementId: string | null;
  disbursementNo: string | null;
  department: string | null;
  productionOrder: string | null;
  reversedAt: string | null;
  reversedBy: string | null;
}

export interface MainQrTrace {
  qrLevel: "MAIN";
  receiving: {
    id: string;
    traceId: string;
    internalLotNo: string;
    supplierLotNo: string | null;
    receiveDate: string;
    receiveQuantity: string;
    convertedQuantity: string;
    status: string;
    material: { id: string; code: string; name: string } | null;
    supplier: { id: string; nameTh: string; nameEn: string | null } | null;
    unitSymbol: string | null;
    confirmedBy: string | null;
    confirmedAt: string | null;
    createdBy: string | null;
    createdAt: string;
  };
  packages: MainQrPackage[];
  movements: MovementSummary[];
  issueHistory: SubQrIssueHistoryEntry[];
  currentRemaining: string;
}

export interface SubQrTrace {
  qrLevel: "SUB";
  package: MainQrPackage;
  parentMainQr: {
    id: string;
    internalLotNo: string;
    material: { id: string; code: string; name: string } | null;
    supplier: { id: string; nameTh: string; nameEn: string | null } | null;
    receiveDate: string;
  } | null;
  movements: MovementSummary[];
  issueHistory: SubQrIssueHistoryEntry[];
  adjustmentHistory: MovementSummary[];
}

export type QrTrace = MainQrTrace | SubQrTrace;

export interface DisbursementFifoAllocation {
  id: string;
  packageId: string;
  lotDetailNo: string | null;
  internalLotNo: string | null;
  receiveDate: string | null;
  fifoOrder: number | null;
  disbursedQuantity: string;
  reversedAt: string | null;
  reversedBy: string | null;
}

export interface DisbursementTrace {
  disbursement: {
    id: string;
    traceId: string;
    disbursementNo: string;
    disbursementType: string;
    disbursementDate: string;
    status: string;
    departmentId: string | null;
    productionOrder: string | null;
    referenceNo: string | null;
    requestedBy: string | null;
    approvedBy: string | null;
    confirmedBy: string | null;
    confirmedAt: string | null;
    cancelledBy: string | null;
    cancelledAt: string | null;
    cancelReason: string | null;
  };
  items: Array<{
    id: string;
    materialId: string;
    material: { id: string; code: string; name: string } | null;
    requestedQuantity: string;
    disbursedQuantity: string;
    fifoAllocations: DisbursementFifoAllocation[];
  }>;
  movements: MovementSummary[];
}

export interface ListMaterialTraceabilityParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  materialId?: string;
  materialCode?: string;
  materialName?: string;
  materialType?: string;
  shape?: string;
  internalLotNo?: string;
  supplierLotNo?: string;
  mainQr?: string;
  subQr?: string;
  transactionType?: StockTransactionType;
  receivingNo?: string;
  disbursementNo?: string;
  supplierId?: string;
  departmentId?: string;
  productionOrder?: string;
  referenceNo?: string;
  operator?: string;
  status?: string;
}

function buildQuery<T extends object>(params: T): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function getMaterialTraceabilityReport(accessToken: string, params: ListMaterialTraceabilityParams = {}) {
  return apiFetch<MaterialTraceabilityReport>(`/material-traceability${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getMaterialTraceabilitySummary(accessToken: string, params: ListMaterialTraceabilityParams = {}) {
  return apiFetch<MaterialTraceabilitySummary>(`/material-traceability/summary${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function traceByQrCode(accessToken: string, code: string) {
  return apiFetch<QrTrace>(`/material-traceability/qr/${encodeURIComponent(code)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function traceMainQr(accessToken: string, id: string) {
  return apiFetch<MainQrTrace>(`/material-traceability/main-qr/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function traceSubQr(accessToken: string, id: string) {
  return apiFetch<SubQrTrace>(`/material-traceability/sub-qr/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function traceReceiving(accessToken: string, id: string) {
  return apiFetch<MainQrTrace>(`/material-traceability/receivings/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function traceDisbursement(accessToken: string, id: string) {
  return apiFetch<DisbursementTrace>(`/material-traceability/disbursements/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
