import { apiFetch } from "./client";

// Mirrors cps-api's generic `/materials` contract — see
// cps-api/API_ENDPOINTS.md § 6 and cps-api/src/modules/materials/
// {materials.controller,materials.service,dto/*}.ts. "/materials/pc" in
// this app is not a distinct backend module — it's the same /materials
// endpoint scoped to `type: "PC"` (see Conventions § Materials PC in
// AGENTS.md).

export type MaterialType = "PC" | "OF" | "OF_MAT";
export type MaterialShape = "PCS" | "PIPE" | "SHEET" | "COIL";
export type MaterialLocationType = "internal" | "external";

export interface MaterialDeletionCheck {
  material: { id: string; code: string; name: string; locationType?: MaterialLocationType };
  canDelete: boolean;
  blockers: string[];
  ownBomCount?: number;
  usageCount?: number;
  canDeleteWithBom?: boolean;
}

export function checkMaterialDeletion(accessToken: string, id: string) {
  return apiFetch<MaterialDeletionCheck>(`/materials/${encodeURIComponent(id)}/deletion-check`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function deleteMaterialPermanently(accessToken: string, id: string, confirmationCode: string, includeBom = false) {
  return apiFetch<{ id: string; code: string; name: string }>(`/materials/${encodeURIComponent(id)}/permanent`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ confirmationCode, ...(includeBom ? { includeBom: true } : {}) }),
  });
}

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
  locationType?: MaterialLocationType;
  ratio: number | null;
  processingMaterialId?: string | null;
  processingMaterial?: MaterialProcessingOutput | null;
  unitId: string;
  deliveryTypeId: string | null;
  // FK into /material-types (PC / OF / OF-MAT master data, 2026-09-16).
  // Independent of the legacy `type` string that scopes the PC page.
  materialTypeId: string | null;
  modelId: string | null;
  loadingPointId: string | null;
  processLineName: string | null;
  scale: string | null;
  imagePath: string | null;
  specification: string | null;
  description: string | null;
  packingQuantity: number | null;
  minimumStock: string;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  unit: MaterialLookup | null;
  model: MaterialLookup | null;
  deliveryType: MaterialLookup | null;
  materialTypeMaster: MaterialLookup | null;
  loadingPoint: MaterialLookup | null;
  suppliers: MaterialLookup[];
}

export interface MaterialProcessingOutput {
  modelId?: string | null;
  loadingPointId?: string | null;
  processLineName?: string | null;
  scale?: string | null;
  locationType?: MaterialLocationType;
  imagePath?: string | null;
  id: string;
  code: string;
  name: string;
  unitId: string;
  specification: string | null;
  packingQuantity: number | null;
  isActive: boolean;
  updatedAt: string;
}

export interface MaterialProcessingOutputPayload {
  modelId?: string | null;
  loadingPointId?: string | null;
  processLineName?: string | null;
  scale?: string | null;
  locationType?: MaterialLocationType;
  imagePath?: string | null;
  code: string;
  name: string;
  unitId: string;
  specification?: string | null;
  packingQuantity: number;
  updatedAt?: string;
}

export interface MaterialLookups {
  units: MaterialLookup[];
  suppliers: MaterialLookup[];
  models: MaterialLookup[];
  deliveryTypes: MaterialLookup[];
  materialTypes: MaterialLookup[];
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
  materialTypeId?: string;
  loadingPointId?: string;
  supplierId?: string;
  sortBy?: "code" | "name" | "isActive" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface MaterialPayload {
  locationType?: MaterialLocationType;
  draftId?: string;
  draftUpdatedAt?: string;
  processingOutput?: MaterialProcessingOutputPayload;
  code: string;
  name: string;
  type?: MaterialType | null;
  materialType: MaterialShape;
  ratio?: number | null;
  unitId: string;
  deliveryTypeId?: string | null;
  materialTypeId?: string | null;
  modelId?: string | null;
  loadingPointId?: string | null;
  processLineName?: string | null;
  scale?: string | null;
  imagePath?: string | null;
  specification?: string | null;
  description?: string | null;
  packingQuantity?: number | null;
  minimumStock?: number;
  supplierIds?: string[];
  isActive?: boolean;
}

export interface MaterialDraftSummary {
  id: string;
  materialId: string | null;
  code: string | null;
  name: string | null;
  materialType: string | null;
  step: number;
  updatedAt: string;
}

export interface MaterialDraftRecord {
  id: string;
  materialId: string | null;
  materialUpdatedAt: string | null;
  outputUpdatedAt: string | null;
  step: number;
  data: Record<string, unknown>;
  supplierIds: string[];
  imagePath: string | null;
  updatedAt: string;
}

export interface SaveMaterialDraftPayload {
  outputImagePath?: string | null;
  id?: string;
  updatedAt?: string;
  materialId: string | null;
  materialUpdatedAt: string | null;
  outputUpdatedAt: string | null;
  step: number;
  data: Record<string, unknown>;
  supplierIds: string[];
  imagePath: string | null;
}

export function listMaterialDrafts(token: string) {
  return apiFetch<MaterialDraftSummary[]>("/materials/drafts", { headers: { Authorization: `Bearer ${token}` } });
}
export function getMaterialDraft(token: string, id: string) {
  return apiFetch<MaterialDraftRecord>(`/materials/drafts/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
}
export function saveMaterialDraft(token: string, data: SaveMaterialDraftPayload) {
  return apiFetch<MaterialDraftRecord>("/materials/drafts", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
}
export function deleteMaterialDraft(token: string, id: string) {
  return apiFetch<{ success: boolean }>(`/materials/drafts/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
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
  lastReceivedAt?: string | null;
}

export type MaterialStockStatus = "NORMAL" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface MaterialInventoryItem extends Material {
  currentStock: string;
  stockStatus: MaterialStockStatus;
  lastMovementAt: string | null;
  lastReceivedAt: string | null;
}

export interface MaterialInventorySummary {
  total: number;
  normal: number;
  lowStock: number;
  outOfStock: number;
}

export interface MaterialInventoryResult extends PaginatedResult<MaterialInventoryItem> {
  summary: MaterialInventorySummary;
}

export interface ListMaterialInventoryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  type?: MaterialType;
  supplierId?: string;
  modelId?: string;
  loadingPointId?: string;
  processLineName?: string;
  stockStatus?: MaterialStockStatus;
  sortBy?: "code" | "name" | "currentStock" | "lastReceivedAt" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export function listStockBalances(accessToken: string) {
  return apiFetch<StockBalance[]>("/stock-balances", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function listMaterialInventory(
  accessToken: string,
  params: ListMaterialInventoryParams = {}
) {
  return apiFetch<MaterialInventoryResult>(`/stock-balances/inventory${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

function buildQuery<T extends object>(params: T): string {
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

export function checkMaterialCodeAvailability(accessToken: string, code: string, excludeId?: string) {
  return apiFetch<{ available: boolean }>(`/materials/code-availability${buildQuery({ code, excludeId })}`, {
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
