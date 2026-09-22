import { apiFetch } from "./client";

export type ProductionPlanStatus =
  "DRAFT" | "APPROVED" | "ISSUED" | "CANCELLED" | "EXPIRED";

export interface ProductionPlanProduct {
  id: string;
  code: string;
  name: string;
  lotSize?: number;
}

export interface ProductionPlanMaterial {
  id: string;
  code: string;
  name: string;
}

export interface ProductionPlanReservation {
  id: string;
  reservedQuantity: string;
  releasedAt: string | null;
  releaseType: "ISSUED" | "CANCELLED" | "EXPIRED" | null;
  materialReceivingPackage?: {
    id: string;
    qrCode?: string;
    lotDetailNo?: string;
    materialReceiving?: { materialId: string; receivingNo?: string };
  };
}

export interface ProductionPlanLine {
  id: string;
  productId: string;
  bomId: string;
  quantity: number;
  needByDate: string;
  remark: string | null;
  product: ProductionPlanProduct;
  bom?: {
    id: string;
    version: string;
    items: Array<{
      id: string;
      materialId: string;
      quantity: number | string;
      isScrap: boolean;
      material: ProductionPlanMaterial;
    }>;
  };
  reservations?: ProductionPlanReservation[];
}

export interface ProductionPlan {
  id: string;
  code: string;
  title: string | null;
  status: ProductionPlanStatus;
  remark: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  lines: ProductionPlanLine[];
}

export interface ProductionPlanLookups {
  products: Array<
    ProductionPlanProduct & { activeBomId: string; activeBomVersion: string }
  >;
}

export interface ProductionPlanLinePayload {
  productId: string;
  quantity: number;
  needByDate: string;
  remark?: string;
}

export interface ProductionPlanPayload {
  title?: string;
  remark?: string;
  lines: ProductionPlanLinePayload[];
}

export interface ProductionPlanShortfall {
  materialId: string;
  materialCode: string;
  materialName: string;
  required: string;
  available: string;
  shortage: string;
}

export interface PaginatedProductionPlans {
  items: ProductionPlan[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface ListProductionPlansParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductionPlanStatus;
  needByDateFrom?: string;
  needByDateTo?: string;
}

function queryString(params: ListProductionPlansParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query.size ? `?${query}` : "";
}

const auth = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export function listProductionPlans(
  accessToken: string,
  params: ListProductionPlansParams = {},
) {
  return apiFetch<PaginatedProductionPlans>(
    `/production-plans${queryString(params)}`,
    { headers: auth(accessToken) },
  );
}

export function getProductionPlan(accessToken: string, id: string) {
  return apiFetch<ProductionPlan>(`/production-plans/${id}`, {
    headers: auth(accessToken),
  });
}

export function getProductionPlanLookups(accessToken: string) {
  return apiFetch<ProductionPlanLookups>("/production-plans/lookups", {
    headers: auth(accessToken),
  });
}

export function createProductionPlan(
  accessToken: string,
  payload: ProductionPlanPayload,
) {
  return apiFetch<ProductionPlan>("/production-plans", {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateProductionPlan(
  accessToken: string,
  id: string,
  payload: ProductionPlanPayload,
) {
  return apiFetch<ProductionPlan>(`/production-plans/${id}`, {
    method: "PATCH",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function importProductionPlan(
  accessToken: string,
  file: File,
  title?: string,
  remark?: string,
) {
  const body = new FormData();
  body.set("file", file);
  if (title?.trim()) body.set("title", title.trim());
  if (remark?.trim()) body.set("remark", remark.trim());
  return apiFetch<ProductionPlan>("/production-plans/import", {
    method: "POST",
    headers: auth(accessToken),
    body,
  });
}

export function approveProductionPlan(accessToken: string, id: string) {
  return apiFetch<ProductionPlan>(`/production-plans/${id}/approve`, {
    method: "POST",
    headers: auth(accessToken),
  });
}

export function issueProductionPlan(accessToken: string, id: string) {
  return apiFetch<ProductionPlan>(`/production-plans/${id}/issue`, {
    method: "POST",
    headers: auth(accessToken),
  });
}

export function cancelProductionPlan(
  accessToken: string,
  id: string,
  reason: string,
) {
  return apiFetch<ProductionPlan>(`/production-plans/${id}/cancel`, {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify({ reason }),
  });
}

export function deleteProductionPlan(accessToken: string, id: string) {
  return apiFetch<void>(`/production-plans/${id}`, {
    method: "DELETE",
    headers: auth(accessToken),
  });
}
