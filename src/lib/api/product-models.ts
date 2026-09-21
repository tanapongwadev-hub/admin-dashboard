import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "รุ่นสินค้า" (product model: Camry, Civic, Corolla)
// lookup. Mirrors cps-api's real `/product-models` module — see
// cps-api/API_ENDPOINTS.md § 5.1 and cps-api/src/modules/product-models/
// {product-models.controller,product-models.service,dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `brand`,
// `description`, `isActive` (all optional). Service normalizes `code` to
// upper-case on write but returns the stored value as-is. Default sort is
// `code`. Update requires the row's current `updatedAt` (optimistic
// concurrency).
//
// Shape A (code/nameTh/nameEn/description) plus one extra optional `brand`
// text field — no other simple-master resource has `brand`.

export interface ProductModel {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  brand: string | null;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListProductModelsParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedProductModels = PaginatedResult<ProductModel>;

export interface ProductModelPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  brand?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateProductModelPayload extends Partial<ProductModelPayload> {
  // Required by cps-api's `UpdateProductModelDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<ProductModel, ProductModelPayload, UpdateProductModelPayload, ListProductModelsParams>(
  "/product-models"
);

export const listProductModels = api.list;
export const getProductModel = api.get;
export const createProductModel = api.create;
export const updateProductModel = api.update;
export const deactivateProductModel = api.deactivate;
export const restoreProductModel = api.restore;