import { apiFetch } from "./client";

// Master data for the "หน่วยนับ" (unit of measure) lookup. Mirrors
// cps-api's real `/units` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/units/{units.controller,
// units.service, dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `symbol`,
// `description`, `isActive` (all optional). Service normalizes `code`
// to upper-case on write but returns the stored value as-is. Default sort
// is `code` (per ListUnitsQueryDto). Update requires the row's current
// `updatedAt` (optimistic concurrency). Compared to the parallel
// `material-models` resource: this module has an extra `symbol` field
// (e.g. "ชิ้น", "กิโลกรัม", "ลิตร") which appears in the form and
// details dialog but is intentionally omitted from the table columns
// to keep the table readable.

export interface Unit {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  symbol: string | null;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListUnitsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedUnits {
  items: Unit[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface UnitPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  symbol?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateUnitPayload extends Partial<UnitPayload> {
  // Required by cps-api's `UpdateUnitDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

function buildQueryString(params: ListUnitsParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return query.toString();
}

export function listUnits(accessToken: string, params: ListUnitsParams = {}) {
  const qs = buildQueryString(params);
  return apiFetch<PaginatedUnits>(`/units${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getUnit(accessToken: string, id: string) {
  return apiFetch<Unit>(`/units/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createUnit(accessToken: string, payload: UnitPayload) {
  return apiFetch<Unit>("/units", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function updateUnit(accessToken: string, id: string, payload: UpdateUnitPayload) {
  return apiFetch<Unit>(`/units/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function deactivateUnit(accessToken: string, id: string) {
  return apiFetch<Unit>(`/units/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function restoreUnit(accessToken: string, id: string) {
  return apiFetch<Unit>(`/units/${id}/restore`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
