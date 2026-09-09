import { apiFetch } from "./client";

// Master data for the "จุดขนถ่าย" (loading point) lookup. Mirrors
// cps-api's real `/loading-points` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/loading-points/{loading-points.controller,
// loading-points.service,dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `description`,
// `isActive` (all optional). Service normalizes `code` to upper-case on
// write but returns the stored value as-is. Default sort is `code` (per
// API_ENDPOINTS.md § 5.1, the typical default for simple masters — the
// only exception in that table is `/categories` whose default is
// `sortOrder`). Update requires the row's current `updatedAt` (optimistic
// concurrency, same shape as Materials PC, Products, and Categories).
//
// Compared to the parallel `categories.ts` resource: this module has
// **no** `parentId`, `sortOrder`, or `iconColor` fields, so the API
// surface and the form dialog both stay simpler (4 fields vs 7).

export interface LoadingPoint {
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

export interface ListLoadingPointsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedLoadingPoints {
  items: LoadingPoint[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface LoadingPointPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateLoadingPointPayload extends Partial<LoadingPointPayload> {
  // Required by cps-api's `UpdateLoadingPointDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

function buildQueryString(params: ListLoadingPointsParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return query.toString();
}

export function listLoadingPoints(accessToken: string, params: ListLoadingPointsParams = {}) {
  const qs = buildQueryString(params);
  return apiFetch<PaginatedLoadingPoints>(`/loading-points${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getLoadingPoint(accessToken: string, id: string) {
  return apiFetch<LoadingPoint>(`/loading-points/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createLoadingPoint(accessToken: string, payload: LoadingPointPayload) {
  return apiFetch<LoadingPoint>("/loading-points", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function updateLoadingPoint(accessToken: string, id: string, payload: UpdateLoadingPointPayload) {
  return apiFetch<LoadingPoint>(`/loading-points/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function deactivateLoadingPoint(accessToken: string, id: string) {
  return apiFetch<LoadingPoint>(`/loading-points/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function restoreLoadingPoint(accessToken: string, id: string) {
  return apiFetch<LoadingPoint>(`/loading-points/${id}/restore`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
