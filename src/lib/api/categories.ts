import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

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
//  - Default sort is `sortOrder` (per API_ENDPOINTS.md § 5.1) — the only
//    simple master where this is true; every other resource defaults to
//    `code`.
//  - Update requires the row's current `updatedAt` (optimistic concurrency,
//    same shape as every other simple master).
//
// The actual list/get/create/update/deactivate/restore functions are the
// shared `createResourceApi` factory (see create-resource-api.ts) — this
// file's only job is declaring the real domain difference: field shapes.

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

export interface ListCategoriesParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "sortOrder" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedCategories = PaginatedResult<Category>;

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

const api = createResourceApi<Category, CategoryPayload, UpdateCategoryPayload, ListCategoriesParams>("/categories");

export const listCategories = api.list;
export const getCategory = api.get;
export const createCategory = api.create;
export const updateCategory = api.update;
export const deactivateCategory = api.deactivate;
export const restoreCategory = api.restore;
