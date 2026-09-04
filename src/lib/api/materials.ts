import { apiFetch } from "./client";

// Mirrors cps-api's generic `/materials` contract — see
// cps-api/API_ENDPOINTS.md § 6 and cps-api/src/modules/materials/
// {materials.controller,materials.service,dto/*}.ts. "/materials/pc" in
// this app is not a distinct backend module — it's the same /materials
// endpoint scoped to `type: "PC"` (see Conventions § Materials PC in
// AGENTS.md).

export type MaterialType = "PC" | "OF" | "OF_MAT";
export type MaterialShape = "PCS" | "PIPE" | "SHEET" | "COIL";

export interface MaterialLookup {
  id: string;
  code: string;
  isActive?: boolean;
  nameTh?: string;
  nameEn?: string;
  symbol?: string;
  description?: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  type: MaterialType | null;
  materialType: MaterialShape;
  ratio: number | null;
  unitId: string;
  deliveryTypeId: string | null;
  modelId: string | null;
  loadingPointId: string | null;
  processLineName: string | null;
  scale: string | null;
  imagePath: string | null;
  specification: string | null;
  description: string | null;
  packingQuantity: number | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  unit: MaterialLookup | null;
  model: MaterialLookup | null;
  deliveryType: MaterialLookup | null;
  loadingPoint: MaterialLookup | null;
  suppliers: MaterialLookup[];
}

export interface MaterialLookups {
  units: MaterialLookup[];
  suppliers: MaterialLookup[];
  models: MaterialLookup[];
  deliveryTypes: MaterialLookup[];
  loadingPoints: MaterialLookup[];
}

export interface PaginatedResult<T> {
  items: T[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface StagedMaterialImage {
  imagePath: string;
  previewUrl: string;
}

export interface ListMaterialsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  type?: MaterialType;
  materialType?: MaterialShape;
  unitId?: string;
  modelId?: string;
  deliveryTypeId?: string;
  loadingPointId?: string;
  supplierId?: string;
  sortBy?: "code" | "name" | "isActive" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface MaterialPayload {
  code: string;
  name: string;
  type?: MaterialType | null;
  materialType: MaterialShape;
  ratio?: number | null;
  unitId: string;
  deliveryTypeId?: string | null;
  modelId?: string | null;
  loadingPointId?: string | null;
  processLineName?: string | null;
  scale?: string | null;
  imagePath?: string | null;
  specification?: string | null;
  description?: string | null;
  packingQuantity?: number | null;
  supplierIds?: string[];
  isActive?: boolean;
}

export interface UpdateMaterialPayload extends Partial<MaterialPayload> {
  updatedAt: string;
}

// Mirrors cps-api's `/stock-balances` module — a separate resource from
// `/materials`, gated on MATERIALS_RECEIVING_VIEW (not MATERIAL_VIEW). A
// material with no receiving history yet has no row here at all; treat a
// missing lookup as quantity 0, not an error.
export interface StockBalance {
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: string;
  unitCode: string;
  unitNameTh: string;
  lastMovementAt: string | null;
}

export function listStockBalances(accessToken: string) {
  return apiFetch<StockBalance[]>("/stock-balances", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

function buildQuery(params: ListMaterialsParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function listMaterials(accessToken: string, params: ListMaterialsParams = {}) {
  return apiFetch<PaginatedResult<Material>>(`/materials${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getMaterialLookups(accessToken: string) {
  return apiFetch<MaterialLookups>("/materials/lookups", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getMaterial(accessToken: string, id: string) {
  return apiFetch<Material>(`/materials/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function uploadMaterialImage(
  accessToken: string,
  file: Blob,
  filename?: string
) {
  const body = new FormData();
  if (filename) body.append("file", file, filename);
  else body.append("file", file);

  return apiFetch<StagedMaterialImage>("/materials/images", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
}

export function createMaterial(accessToken: string, payload: MaterialPayload) {
  return apiFetch<Material>("/materials", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function updateMaterial(accessToken: string, id: string, payload: UpdateMaterialPayload) {
  return apiFetch<Material>(`/materials/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

// Soft delete — sets isActive: false server-side, does not remove the row.
export function deactivateMaterial(accessToken: string, id: string) {
  return apiFetch<Material>(`/materials/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function restoreMaterial(accessToken: string, id: string) {
  return apiFetch<Material>(`/materials/${id}/restore`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
