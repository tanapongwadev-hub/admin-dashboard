import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "ประเภทสินค้า" (product type: FG / SFG / RM) lookup.
// Mirrors cps-api's real `/product-types` module — see
// cps-api/API_ENDPOINTS.md § 5.1 and cps-api/src/modules/product-types/
// {product-types.controller,product-types.service,dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `description`,
// `sortOrder`, `isActive` (all optional). Service normalizes `code` to
// upper-case on write but returns the stored value as-is. Default sort is
// `sortOrder` (matches Categories' own precedent — the only two simple
// masters where this is true). Update requires the row's current `updatedAt`
// (optimistic concurrency, same shape as every other simple master).
//
// Structural twin of `/categories` (Shape C-minus: code/nameTh/nameEn/
// description/sortOrder, no `parentId`/`iconColor`).

export interface ProductType {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListProductTypesParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "sortOrder" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedProductTypes = PaginatedResult<ProductType>;

export interface ProductTypePayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateProductTypePayload extends Partial<ProductTypePayload> {
  // Required by cps-api's `UpdateProductTypeDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<ProductType, ProductTypePayload, UpdateProductTypePayload, ListProductTypesParams>(
  "/product-types"
);

export const listProductTypes = api.list;
export const getProductType = api.get;
export const createProductType = api.create;
export const updateProductType = api.update;
export const deactivateProductType = api.deactivate;
export const restoreProductType = api.restore;