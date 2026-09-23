import { apiFetch } from "./client";

// Mirrors cps-api's real `/materials-disbursement` module — see
// cps-api/src/modules/materials-disbursement/{materials-disbursement.controller,
// materials-disbursement.service,dto/*}.ts (undocumented in
// API_ENDPOINTS.md; confirmed by reading the source directly, same standing
// rule as Menu management/BOMs). As of 2026-09-20 this covers the full
// create/update/delete/confirm/cancel lifecycle (see AGENTS.md § Material
// Disbursement) — mirrors materials-receiving.ts's shape, except there is no
// `updatedAt` optimistic-concurrency field on update (cps-api's
// UpdateMaterialsDisbursementDto has no such field; update is only ever
// allowed while `status === "draft"`, guarded by a pessimistic row lock
// server-side instead).

export type DisbursementStatus = "draft" | "confirmed" | "cancelled";
export type DisbursementType = "stock_cut" | "production";

export interface MaterialDisbursementItem {
  id: string;
  materialId: string;
  requestedQuantity: string;
  disbursedQuantity: string;
  // imagePath added to the backend's list/detail response 2026-09-20 (same
  // one-line addition materials-receiving.service.ts's toListResponse
  // needed — see AGENTS.md § Material Receiving) so the table can show each
  // item's material photo instead of just code/name.
  material: { id: string; code: string; name: string; imagePath: string | null } | null;
}

export interface MaterialsDisbursement {
  id: string;
  disbursementNo: string;
  disbursementType: DisbursementType;
  disbursementDate: string;
  status: DisbursementStatus;
  reason: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  remark: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  productionPlanId: string | null;
  /**
   * Set only when this document was issued from a Material Job Order's
   * "จ่ายออก" action — cps-api rejects cancelling it from this page
   * (409), see materials-disbursement-table.tsx's cancel-action gate.
   */
  materialJobOrderId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  items: MaterialDisbursementItem[];
}

export interface MaterialsDisbursementLookupMaterial {
  id: string;
  code: string;
  name: string;
  unitId: string;
  availableStock: string;
}

export interface MaterialsDisbursementLookups {
  disbursementTypes: { value: DisbursementType; label: string }[];
  materials: MaterialsDisbursementLookupMaterial[];
  units: { id: string; code: string; nameTh: string }[];
}

export interface PaginatedResult<T> {
  items: T[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface ListMaterialsDisbursementParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: DisbursementStatus;
  disbursementType?: DisbursementType;
  disbursementDateFrom?: string;
  disbursementDateTo?: string;
  // Real cps-api filter field, resolved from ?materialCode= by page.tsx
  // (same "code in the URL, id in the query" pattern as Materials
  // Receiving's own materialId filter) — see AGENTS.md § Material
  // Disbursement.
  materialId?: string;
  sortBy?: "disbursementNo" | "disbursementDate" | "createdAt";
  sortOrder?: "asc" | "desc";
}

function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function listMaterialsDisbursement(
  accessToken: string,
  params: ListMaterialsDisbursementParams = {}
) {
  return apiFetch<PaginatedResult<MaterialsDisbursement>>(
    `/materials-disbursement${buildQueryString(params as Record<string, unknown>)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

export function getMaterialsDisbursementLookups(accessToken: string) {
  return apiFetch<MaterialsDisbursementLookups>("/materials-disbursement/lookups", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getMaterialsDisbursement(accessToken: string, id: string) {
  return apiFetch<MaterialsDisbursement>(`/materials-disbursement/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface DisbursementItemPayload {
  materialId: string;
  requestedQuantity: string;
}

export interface CreateMaterialsDisbursementPayload {
  disbursementType: DisbursementType;
  disbursementDate: string;
  // Required by cps-api when disbursementType === "stock_cut" — validated
  // client-side too (see materials-disbursement-form-dialog.tsx) but the
  // backend re-checks regardless.
  reason?: string;
  remark?: string;
  items: DisbursementItemPayload[];
}

// Partial — cps-api's UpdateMaterialsDisbursementDto is
// PartialType(CreateMaterialsDisbursementDto). Only ever accepted while the
// disbursement is still a draft (server-enforced via a pessimistic lock).
export type UpdateMaterialsDisbursementPayload = Partial<CreateMaterialsDisbursementPayload>;

export function createMaterialsDisbursement(
  accessToken: string,
  payload: CreateMaterialsDisbursementPayload
) {
  return apiFetch<MaterialsDisbursement>("/materials-disbursement", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function updateMaterialsDisbursement(
  accessToken: string,
  id: string,
  payload: UpdateMaterialsDisbursementPayload
) {
  return apiFetch<MaterialsDisbursement>(`/materials-disbursement/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function deleteMaterialsDisbursement(accessToken: string, id: string) {
  return apiFetch<void>(`/materials-disbursement/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function confirmMaterialsDisbursement(accessToken: string, id: string) {
  return apiFetch<MaterialsDisbursement>(`/materials-disbursement/${id}/confirm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function cancelMaterialsDisbursement(accessToken: string, id: string, cancelReason: string) {
  return apiFetch<MaterialsDisbursement>(`/materials-disbursement/${id}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ cancelReason }),
  });
}
