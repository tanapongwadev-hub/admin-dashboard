import { apiFetch } from "./client";

// Master data for the "หมวดหมู่" (category) lookup used across the system.
// Mirrors cps-api's real `/categories` module — see
// cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/categories/{categories.controller,categories.service,dto/*}.ts.
//
// Backend fields: `code`, `nameTh` (required), `nameEn`, `parentId`,
// `sortOrder`, `iconColor`, `description`, `isActive` (all optional). The
// service normalizes `code` to upper-case on write, but the response returns
// the stored value as-is.
//
// Notes vs. other simple master modules:
//  - `parentId` makes the resource a 1-level tree (a category may point at
//    another active category as its parent). The admin UI does NOT expose
//    the tree structure today — it's stored but not surfaced — matching the
//    backend's own `/categories` list which returns a flat paginated list.
//  - Default sort is `sortOrder` (per API_ENDPOINTS.md § 5.1), not `code`.
//  - Update requires the row's current `updatedAt` (optimistic concurrency,
//    same shape as Materials PC and Products).

export interface Category {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  parentId: string | null;
  sortOrder: number;
  iconColor: string | null;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "code" | "nameTh" | "sortOrder" | "isActive" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedCategories {
  items: Category[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface CategoryPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  iconColor?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateCategoryPayload extends Partial<CategoryPayload> {
  // Required by cps-api's `UpdateCategoryDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

function buildQueryString(params: ListCategoriesParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return query.toString();
}

export function listCategories(accessToken: string, params: ListCategoriesParams = {}) {
  const qs = buildQueryString(params);
  return apiFetch<PaginatedCategories>(`/categories${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getCategory(accessToken: string, id: string) {
  return apiFetch<Category>(`/categories/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createCategory(accessToken: string, payload: CategoryPayload) {
  return apiFetch<Category>("/categories", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function updateCategory(accessToken: string, id: string, payload: UpdateCategoryPayload) {
  return apiFetch<Category>(`/categories/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function deactivateCategory(accessToken: string, id: string) {
  return apiFetch<Category>(`/categories/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function restoreCategory(accessToken: string, id: string) {
  return apiFetch<Category>(`/categories/${id}/restore`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
