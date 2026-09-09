import { apiFetch } from "./client";

// Master data for the "รุ่นวัสดุ" (material model) lookup. Mirrors
// cps-api's real `/material-models` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/material-models/{material-models.controller,
// material-models.service, dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `description`,
// `isActive` (all optional). Service normalizes `code` to upper-case on
// write but returns the stored value as-is. Default sort is `code` (per
// ListMaterialModelsQueryDto in the backend DTO). Update requires the row's
// current `updatedAt` (optimistic concurrency, same shape as all other simple
// master resources).
//
// Compared to the parallel `categories.ts` resource: this module has
// **no** `parentId`, `sortOrder`, or `iconColor` fields, so the API
// surface and the form dialog both stay simpler (4 fields vs 7).

export interface MaterialModel {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListMaterialModelsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedMaterialModels {
  items: MaterialModel[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface MaterialModelPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateMaterialModelPayload extends Partial<MaterialModelPayload> {
  // Required by cps-api's `UpdateMaterialModelDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

function buildQueryString(params: ListMaterialModelsParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return query.toString();
}

export function listMaterialModels(accessToken: string, params: ListMaterialModelsParams = {}) {
  const qs = buildQueryString(params);
  return apiFetch<PaginatedMaterialModels>(`/material-models${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getMaterialModel(accessToken: string, id: string) {
  return apiFetch<MaterialModel>(`/material-models/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createMaterialModel(accessToken: string, payload: MaterialModelPayload) {
  return apiFetch<MaterialModel>("/material-models", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function updateMaterialModel(accessToken: string, id: string, payload: UpdateMaterialModelPayload) {
  return apiFetch<MaterialModel>(`/material-models/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function deactivateMaterialModel(accessToken: string, id: string) {
  return apiFetch<MaterialModel>(`/material-models/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function restoreMaterialModel(accessToken: string, id: string) {
  return apiFetch<MaterialModel>(`/material-models/${id}/restore`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
