import { apiFetch } from "./client";

// Mirrors cps-api's real `/boms` module — see
// cps-api/src/modules/boms/{boms.controller,boms.service,dto/*}.ts (not
// documented in API_ENDPOINTS.md; confirmed by reading the source directly,
// same standing rule as Menu management). A BOM always belongs to exactly
// one Product (`productId`), is versioned per product ("v1", "v2", ...
// computed server-side on every create — never sent by the client), and
// every create defaults to `status: "DRAFT"` (the entity's own column
// default) — there is no way to create a BOM pre-activated; `activate()` is
// a separate call. `activate` also deactivates any other ACTIVE BOM for the
// same product server-side (only one ACTIVE version per product at a time).

export type BomStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export interface BomItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  sortOrder: number;
  quantity: number;
  unitId: string;
  unitNameTh: string;
  isScrap: boolean;
  wastagePercent: number | null;
  remark: string | null;
}

export interface Bom {
  id: string;
  productId: string;
  version: string;
  status: BomStatus;
  specification: string | null;
  remark: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  product: { id: string; code: string; nameTh: string };
  items: BomItem[];
}

export interface CreateBomItemPayload {
  materialId: string;
  quantity: number;
  unitId: string;
  isScrap?: boolean;
  wastagePercent?: number | null;
  remark?: string | null;
}

export interface CreateBomPayload {
  productId: string;
  specification?: string | null;
  remark?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  items: CreateBomItemPayload[];
}

export function createBom(accessToken: string, payload: CreateBomPayload) {
  return apiFetch<Bom>("/boms", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function activateBom(accessToken: string, id: string) {
  return apiFetch<Bom>(`/boms/${id}/activate`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function listBomsByProduct(accessToken: string, productId: string) {
  return apiFetch<Bom[]>(`/boms/product/${productId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
