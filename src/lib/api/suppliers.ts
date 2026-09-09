import { apiFetch } from "./client";

// Master data for the "ผู้จัดจำหน่าย" (supplier) lookup. Mirrors
// cps-api's real `/suppliers` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/suppliers/{suppliers.controller,
// suppliers.service, dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `taxId`,
// `contactName`, `telephone`, `email`, `address`, `isActive` (all optional).
// Service normalizes `code` to upper-case on write but returns the stored
// value as-is. Default sort is `code` (per ListSuppliersQueryDto).
// Update requires the row's current `updatedAt` (optimistic concurrency).

export interface Supplier {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  taxId: string | null;
  contactName: string | null;
  telephone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListSuppliersParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedSuppliers {
  items: Supplier[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface SupplierPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  taxId?: string | null;
  contactName?: string | null;
  telephone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export interface UpdateSupplierPayload extends Partial<SupplierPayload> {
  // Required by cps-api's `UpdateSupplierDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

function buildQueryString(params: ListSuppliersParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return query.toString();
}

export function listSuppliers(accessToken: string, params: ListSuppliersParams = {}) {
  const qs = buildQueryString(params);
  return apiFetch<PaginatedSuppliers>(`/suppliers${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getSupplier(accessToken: string, id: string) {
  return apiFetch<Supplier>(`/suppliers/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createSupplier(accessToken: string, payload: SupplierPayload) {
  return apiFetch<Supplier>("/suppliers", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function updateSupplier(accessToken: string, id: string, payload: UpdateSupplierPayload) {
  return apiFetch<Supplier>(`/suppliers/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function deactivateSupplier(accessToken: string, id: string) {
  return apiFetch<Supplier>(`/suppliers/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function restoreSupplier(accessToken: string, id: string) {
  return apiFetch<Supplier>(`/suppliers/${id}/restore`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
