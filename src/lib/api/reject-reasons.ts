import { apiFetch } from "./client";

// Master data for the "เหตุผลการปฏิเสธ" (reject reason) lookup. Mirrors
// cps-api's real `/reject-reasons` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/reject-reasons/{reject-reasons.controller,
// reject-reasons.service,dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `description`,
// `isActive` (all optional). Service normalizes `code` to upper-case on
// write but returns the stored value as-is. Default sort is `code` (per
// API_ENDPOINTS.md § 5.1, the typical default for simple masters — the
// only exception in that table is `/categories` whose default is
// `sortOrder`). Update requires the row's current `updatedAt` (optimistic
// concurrency, same shape as Materials PC, Products, Categories, Loading
// Points, and Delivery Types).
//
// This resource is a byte-for-byte structural twin of `/loading-points`
// and `/delivery-types`: same 4 fields, same DTO validation, same default
// sort, same create/update/deactivate/restore endpoints, same
// `REJECT_REASON_*` permission codes. The only differences are the URL
// path, the menu label/icon (`x-circle` instead of `map-pin` or `truck`,
// already in `lib/menu-icons.ts` since the menus round on 2026-09-02),
// and the permission-prefix string. See AGENTS.md § Loading Points for
// the "Rule for the next simple-master page" that turned this trio into
// a copy-paste recipe.

export interface RejectReason {
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

export interface ListRejectReasonsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedRejectReasons {
  items: RejectReason[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface RejectReasonPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateRejectReasonPayload extends Partial<RejectReasonPayload> {
  // Required by cps-api's `UpdateRejectReasonDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

function buildQueryString(params: ListRejectReasonsParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return query.toString();
}

export function listRejectReasons(accessToken: string, params: ListRejectReasonsParams = {}) {
  const qs = buildQueryString(params);
  return apiFetch<PaginatedRejectReasons>(`/reject-reasons${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getRejectReason(accessToken: string, id: string) {
  return apiFetch<RejectReason>(`/reject-reasons/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createRejectReason(accessToken: string, payload: RejectReasonPayload) {
  return apiFetch<RejectReason>("/reject-reasons", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function updateRejectReason(accessToken: string, id: string, payload: UpdateRejectReasonPayload) {
  return apiFetch<RejectReason>(`/reject-reasons/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function deactivateRejectReason(accessToken: string, id: string) {
  return apiFetch<RejectReason>(`/reject-reasons/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function restoreRejectReason(accessToken: string, id: string) {
  return apiFetch<RejectReason>(`/reject-reasons/${id}/restore`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
