import { apiFetch } from "./client";

// Mirrors cps-api's real `/materials-receiving` module — see
// cps-api/API_ENDPOINTS.md § 9 and
// cps-api/src/modules/materials-receiving/{materials-receiving.controller,materials-receiving.service,dto/*}.ts.
// A receiving is created as `draft` (server generates Internal Lot,
// Supplier Lot, box/package breakdown, and one QR per box, all inside one
// transaction) and only affects stock once `confirm`ed — a separate call.
// This app's wizard calls create() then confirm() back-to-back so "Confirm
// Receive" reads as one user action (see AGENTS.md § Material Receiving).
//
// Internal Lot No. format: CCI-{YY}{MonthCode}{DD}-{SEQ}, e.g.
// "CCI-26J07-001" — fixed "CCI" prefix (deliberately NOT the material's own
// code — the sequence is shared across every material received on a given
// date, so the prefix has to stay a fixed literal for lot numbers to stay
// unique). MonthCode is a custom mapping (Jan-Dec = A,B,C,D,F,G,H,I,J,K,L,M,
// deliberately skipping "E"), NOT a calendar abbreviation.
// Supplier Lot No. format: {YY}{MonthCode}{DD}, e.g. "26J07" — deterministic
// from supplierProductionDate alone, no running number. The real sequence
// number is only known after create() — the frontend may preview the
// non-sequence parts of the code but must never invent the running number.

export type MaterialReceivingStatus = "draft" | "confirmed" | "cancelled";
export type MaterialReceivingPackageStatus =
  | "pending"
  | "in_stock"
  | "partial"
  | "issued"
  | "damaged"
  | "returned";

export interface MaterialReceivingPackage {
  id: string;
  packageNo: number;
  lotDetailNo: string | null;
  quantity: string;
  remainingQuantity: string;
  qrCode: string | null;
  status: MaterialReceivingPackageStatus;
}

export interface MaterialReceivingLookup {
  id: string;
  code: string;
  nameTh?: string;
  nameEn?: string | null;
  symbol?: string | null;
}

export interface MaterialReceiving {
  id: string;
  runNo: string | null;
  internalLotNo: string;
  organizationId: string;
  supplierId: string;
  materialId: string;
  unitId: string;
  receiveQuantity: string;
  packingQuantity: number;
  packageCount: number;
  supplierLotNo: string | null;
  supplierProductionDate: string | null;
  receiveDate: string;
  status: MaterialReceivingStatus;
  poNo: string | null;
  materialType: string | null;
  ratio: number | null;
  piecesQuantity: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  remark: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: MaterialReceivingLookup | null;
  material: { id: string; code: string; name: string; imagePath: string | null } | null;
  packages: MaterialReceivingPackage[] | null;
}

export interface MaterialReceivingLookupMaterial {
  id: string;
  code: string;
  name: string;
  packingQuantity: number | null;
  materialType: string | null;
  ratio: number | null;
  unitId: string;
  unit: string;
}

export interface MaterialReceivingLookups {
  suppliers: MaterialReceivingLookup[];
  materials: MaterialReceivingLookupMaterial[];
  units: MaterialReceivingLookup[];
}

export interface PaginatedResult<T> {
  items: T[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface ListMaterialsReceivingParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: MaterialReceivingStatus;
  supplierId?: string;
  materialId?: string;
  receiveDateFrom?: string;
  receiveDateTo?: string;
  sortBy?: "internalLotNo" | "receiveDate" | "supplierLotNo" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateMaterialsReceivingPayload {
  materialId: string;
  supplierId?: string;
  receiveQuantity: string;
  supplierProductionDate: string;
  receiveDate: string;
}

export interface MaterialReceivingPackageLookup {
  packageId: string;
  packageNo: number;
  lotDetailNo: string | null;
  materialId: string;
  materialCode: string;
  materialName: string;
  internalLotNo: string;
  supplierLotNo: string | null;
  initialQuantity: string;
  currentQuantity: string;
  unitSymbol: string;
  receiveDate: string;
  supplierProductionDate: string | null;
  status: MaterialReceivingPackageStatus;
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

export function listMaterialsReceiving(accessToken: string, params: ListMaterialsReceivingParams = {}) {
  return apiFetch<PaginatedResult<MaterialReceiving>>(`/materials-receiving${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getMaterialsReceivingLookups(accessToken: string) {
  return apiFetch<MaterialReceivingLookups>("/materials-receiving/lookups", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getSuppliersByMaterial(accessToken: string, materialId: string) {
  return apiFetch<MaterialReceivingLookup[]>(
    `/materials-receiving/suppliers?materialId=${encodeURIComponent(materialId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

export function getMaterialReceiving(accessToken: string, id: string) {
  return apiFetch<MaterialReceiving>(`/materials-receiving/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createMaterialsReceiving(accessToken: string, payload: CreateMaterialsReceivingPayload) {
  return apiFetch<MaterialReceiving>("/materials-receiving", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function confirmMaterialsReceiving(accessToken: string, id: string) {
  return apiFetch<MaterialReceiving>(`/materials-receiving/${id}/confirm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function cancelMaterialsReceiving(accessToken: string, id: string, cancelReason: string) {
  return apiFetch<MaterialReceiving>(`/materials-receiving/${id}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ cancelReason }),
  });
}

export function deleteMaterialsReceiving(accessToken: string, id: string) {
  return apiFetch<void>(`/materials-receiving/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// Scan-a-box lookup — resolves a package's printed QR content (its
// lotDetailNo, e.g. "MAT-A-26J07-001-001") to the latest tracking data.
export function getPackageByCode(accessToken: string, lotDetailNo: string) {
  return apiFetch<MaterialReceivingPackageLookup>(
    `/materials-receiving/packages/by-code/${encodeURIComponent(lotDetailNo)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}
