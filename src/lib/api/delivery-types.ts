import { apiFetch } from "./client";

// Master data for the "ประเภทการจัดส่ง" (delivery type) lookup. Mirrors
// cps-api's real `/delivery-types` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/delivery-types/{delivery-types.controller,
// delivery-types.service,dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `description`,
// `isActive` (all optional). Service normalizes `code` to upper-case on
// write but returns the stored value as-is. Default sort is `code` (per
// API_ENDPOINTS.md § 5.1, the typical default for simple masters — the
// only exception in that table is `/categories` whose default is
// `sortOrder`). Update requires the row's current `updatedAt` (optimistic
// concurrency, same shape as Materials PC, Products, Categories, and
// Loading Points).
//
// This resource is a byte-for-byte structural twin of `/loading-points`:
// same 4 fields, same DTO validation, same default sort, same
// create/update/deactivate/restore endpoints, same `DELIVERY_TYPE_*`
// permission codes. The only difference is the URL path and the menu
// label/icon (`truck` instead of `map-pin`). See AGENTS.md § Loading
// Points for the "Rule for the next simple-master page" that turned
// this pair into a copy-paste recipe.

export interface DeliveryType {
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

export interface ListDeliveryTypesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedDeliveryTypes {
  items: DeliveryType[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface DeliveryTypePayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateDeliveryTypePayload extends Partial<DeliveryTypePayload> {
  // Required by cps-api's `UpdateDeliveryTypeDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

function buildQueryString(params: ListDeliveryTypesParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return query.toString();
}

export function listDeliveryTypes(accessToken: string, params: ListDeliveryTypesParams = {}) {
  const qs = buildQueryString(params);
  return apiFetch<PaginatedDeliveryTypes>(`/delivery-types${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getDeliveryType(accessToken: string, id: string) {
  return apiFetch<DeliveryType>(`/delivery-types/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createDeliveryType(accessToken: string, payload: DeliveryTypePayload) {
  return apiFetch<DeliveryType>("/delivery-types", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function updateDeliveryType(accessToken: string, id: string, payload: UpdateDeliveryTypePayload) {
  return apiFetch<DeliveryType>(`/delivery-types/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function deactivateDeliveryType(accessToken: string, id: string) {
  return apiFetch<DeliveryType>(`/delivery-types/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function restoreDeliveryType(accessToken: string, id: string) {
  return apiFetch<DeliveryType>(`/delivery-types/${id}/restore`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
