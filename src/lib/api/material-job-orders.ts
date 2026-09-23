import { apiFetch } from "./client";
import type { MaterialJobOrderStatus } from "./production-plans";

export interface MaterialJobOrderListRow {
  id: string;
  code: string;
  status: MaterialJobOrderStatus;
  productionPlan: {
    id: string;
    code: string;
    approvedAt: string | null;
    approvedBy: string | null;
  };
  products: Array<{
    productCode: string;
    productName: string;
    quantity: number;
    needByDate: string;
  }>;
  materialCount: number;
  packageCount: number;
  createdBy: string | null;
  createdAt: string;
}

export interface MaterialJobOrderMaterialSummary {
  materialCode: string;
  materialName: string;
  reserved: string;
  issued: string;
  outstanding: string;
}

export interface MaterialJobOrderPickLine {
  reservationId: string;
  qrCode: string | null;
  materialCode: string;
  materialName: string;
  internalLotNo: string;
  supplierLotNo: string;
  packageNo: number;
  loadingPointId: string | null;
  currentQuantity: string;
  reservedQuantity: string;
  issuedQuantity: string;
  outstandingQuantity: string;
  pickedAt: string | null;
  pickedBy: string | null;
  releasedAt: string | null;
  status: string;
}

export interface MaterialJobOrderDetail {
  id: string;
  code: string;
  status: MaterialJobOrderStatus;
  version: number;
  printCount: number;
  lastPrintedBy: string | null;
  lastPrintedAt: string | null;
  completedBy: string | null;
  completedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdBy: string | null;
  createdAt: string;
  productionPlan: {
    id: string;
    code: string;
    title: string | null;
    status: string;
    approvedBy: string | null;
    approvedAt: string | null;
    lines: Array<{
      id: string;
      productId: string;
      productCode: string;
      productName: string;
      quantity: number;
      needByDate: string;
      bomVersion: string | null;
    }>;
  };
  materials: MaterialJobOrderMaterialSummary[];
  pickLines: MaterialJobOrderPickLine[];
  disbursements: Array<{
    id: string;
    disbursementNo: string;
    status: string;
    confirmedAt: string | null;
    confirmedBy: string | null;
  }>;
}

export interface PaginatedMaterialJobOrders {
  items: MaterialJobOrderListRow[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface ListMaterialJobOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  approvedDateFrom?: string;
  approvedDateTo?: string;
}

function queryString(params: ListMaterialJobOrdersParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query.size ? `?${query}` : "";
}

const auth = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export function listMaterialJobOrders(
  accessToken: string,
  params: ListMaterialJobOrdersParams = {},
) {
  return apiFetch<PaginatedMaterialJobOrders>(
    `/material-job-orders${queryString(params)}`,
    { headers: auth(accessToken) },
  );
}

export function getMaterialJobOrder(accessToken: string, id: string) {
  return apiFetch<MaterialJobOrderDetail>(`/material-job-orders/${id}`, {
    headers: auth(accessToken),
  });
}

export function printMaterialJobOrder(accessToken: string, id: string) {
  return apiFetch<MaterialJobOrderDetail>(
    `/material-job-orders/${id}/print`,
    { method: "POST", headers: auth(accessToken) },
  );
}

export function pickMaterialJobOrder(
  accessToken: string,
  id: string,
  payload: { version: number; reservationId: string; scannedCode: string },
) {
  return apiFetch<MaterialJobOrderDetail>(`/material-job-orders/${id}/pick`, {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function issueMaterialJobOrder(
  accessToken: string,
  id: string,
  payload: {
    version: number;
    items: Array<{ reservationId: string; quantity: string }>;
  },
) {
  return apiFetch<MaterialJobOrderDetail>(`/material-job-orders/${id}/issue`, {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}
