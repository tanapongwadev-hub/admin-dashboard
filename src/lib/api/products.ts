import { apiFetch } from "./client";

// Mirrors cps-api's real `/products` module — see cps-api/API_ENDPOINTS.md § 7
// and cps-api/src/modules/products/{products.controller,products.service,dto/*}.ts.
// Unlike "/materials/pc" this IS a distinct backend module, not a filtered view
// over another resource. No page/limit in the list DTO — the backend returns
// the full matching set with just a totalItems count.

export interface ProductLookupItem {
  id: string;
  code: string;
  nameTh: string;
  nameEn?: string | null;
}

export interface ProductLookups {
  units: ProductLookupItem[];
  productModels: ProductLookupItem[];
  customers: ProductLookupItem[];
  locations: ProductLookupItem[];
  productTypes: ProductLookupItem[];
  deliveryTypes: ProductLookupItem[];
  loadingPoints: ProductLookupItem[];
  processLines: ProductLookupItem[];
}

export interface Product {
  id: string;
  code: string;
  name: string;
  unitId: string;
  modelId: string;
  customerId: string;
  packing: number;
  locationId: string;
  safetyStock: number;
  productTypeId: string;
  lotSize: number;
  minStock: number;
  deliveryTypeId: string;
  scale: string | null;
  loadingPointId: string;
  processLineId: string;
  productImagePath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  unit: ProductLookupItem | null;
  model: ProductLookupItem | null;
  customer: ProductLookupItem | null;
  location: ProductLookupItem | null;
  productType: ProductLookupItem | null;
  deliveryType: ProductLookupItem | null;
  loadingPoint: ProductLookupItem | null;
  processLine: ProductLookupItem | null;
}

export interface ProductListResult {
  items: Product[];
  meta: { totalItems: number };
}

export interface ListProductsParams {
  search?: string;
  isActive?: boolean;
  modelId?: string;
  customerId?: string;
  productTypeId?: string;
  locationId?: string;
  processLineId?: string;
  sortBy?: "code" | "name" | "isActive" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface ProductPayload {
  code: string;
  name: string;
  unitId: string;
  modelId: string;
  customerId: string;
  locationId: string;
  productTypeId: string;
  deliveryTypeId: string;
  loadingPointId: string;
  processLineId: string;
  packing?: number;
  lotSize?: number;
  safetyStock?: number | null;
  minStock?: number | null;
  scale?: string | null;
  // Optional on both create and update per cps-api's CreateProductDto/
  // UpdateProductDto (unlike Materials PC's imagePath, which is required on
  // create) — confirmed by reading the DTOs directly, not assumed from the
  // Materials PC pattern. `null` clears an existing image; `undefined` (the
  // default) leaves it untouched on update.
  productImagePath?: string | null;
  isActive?: boolean;
}

// Mirrors cps-api's StagedProductImage (`product-image-storage.service.ts`)
// — same two-step stage-then-save flow as Materials PC's images:
// POST /products/images stages the file and returns a path, which is then
// sent as `productImagePath` on the create/update payload.
export interface StagedProductImage {
  imagePath: string;
  previewUrl: string;
}

export function uploadProductImage(accessToken: string, file: Blob, filename?: string) {
  const body = new FormData();
  if (filename) body.append("file", file, filename);
  else body.append("file", file);

  return apiFetch<StagedProductImage>("/products/images", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
}

export interface UpdateProductPayload extends Partial<ProductPayload> {
  updatedAt: string;
}

function buildQuery(params: ListProductsParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function listProducts(accessToken: string, params: ListProductsParams = {}) {
  return apiFetch<ProductListResult>(`/products${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getProductLookups(accessToken: string) {
  return apiFetch<ProductLookups>("/products/lookups", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getProduct(accessToken: string, id: string) {
  return apiFetch<Product>(`/products/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createProduct(accessToken: string, payload: ProductPayload) {
  return apiFetch<Product>("/products", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function updateProduct(accessToken: string, id: string, payload: UpdateProductPayload) {
  return apiFetch<Product>(`/products/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

// Soft delete — sets isActive: false server-side, does not remove the row.
export function deactivateProduct(accessToken: string, id: string) {
  return apiFetch<Product>(`/products/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function restoreProduct(accessToken: string, id: string) {
  return apiFetch<Product>(`/products/${id}/restore`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
