import { apiFetch } from "./client";

// Mirrors cps-api src/modules/sales (sales.service.ts). Quantities are whole
// pieces — FG boxes hold integer counts — so they are plain numbers here.

export type SalesOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_SHIPPED"
  | "SHIPPED"
  | "CANCELLED";

export type SalesJobOrderStatus =
  | "WAITING_PICKING"
  | "READY_TO_ISSUE"
  | "PARTIALLY_ISSUED"
  | "ISSUED"
  | "CANCELLED";

export interface SalesCustomerRef {
  id: string;
  code: string;
  nameTh: string;
}

export interface SalesProductRef {
  id: string;
  code: string;
  name: string;
  unitName: string | null;
}

export interface PageMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface SalesLookups {
  customers: SalesCustomerRef[];
  products: Array<
    SalesProductRef & {
      customerId: string;
      packedQty: number;
      availableQty: number;
      boxCount: number;
    }
  >;
}

export interface SalesOrderListRow {
  id: string;
  code: string;
  status: SalesOrderStatus;
  version: number;
  customerPo: string | null;
  orderDate: string;
  dueDate: string | null;
  createdAt: string;
  customer: SalesCustomerRef;
  lineCount: number;
  totalQuantity: number;
  shippedQuantity: number;
  jobOrder: { id: string; code: string; status: SalesJobOrderStatus } | null;
}

export interface SalesOrderLine {
  id: string;
  lineNo: number;
  productId: string;
  quantity: number;
  shippedQuantity: number;
  remark: string | null;
  product: SalesProductRef;
}

export interface SalesOrderDetail extends Omit<SalesOrderListRow, "lineCount"> {
  remark: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  updatedAt: string;
  lines: SalesOrderLine[];
}

export interface SalesOrderPayload {
  customerId: string;
  orderDate: string;
  dueDate?: string | null;
  customerPo?: string | null;
  remark?: string | null;
  lines: Array<{ productId: string; quantity: number; remark?: string | null }>;
}

export interface SalesShortfall {
  productId: string;
  productCode: string;
  productName: string;
  required: number;
  available: number;
  shortfall: number;
}

export interface SalesJobOrderListRow {
  id: string;
  code: string;
  status: SalesJobOrderStatus;
  version: number;
  printCount: number;
  createdAt: string;
  completedAt: string | null;
  salesOrder: { id: string; code: string; status: SalesOrderStatus; dueDate: string | null };
  customer: SalesCustomerRef;
  boxCount: number;
  pickedCount: number;
  reservedQty: number;
  issuedQty: number;
}

export interface SalesPickLine {
  id: string;
  salesOrderLineId: string;
  reservedQty: number;
  issuedQty: number;
  outstandingQty: number;
  pickedAt: string | null;
  pickedByName: string | null;
  releasedAt: string | null;
  releaseType: "ISSUED" | "CANCELLED" | null;
  package: {
    id: string;
    qrCode: string;
    boxNo: number;
    currentQty: number;
    initialQty: number;
    status: string;
    lotNo: string;
    productionDate: string | null;
  };
  product: SalesProductRef;
}

export interface SalesJobOrderDetail {
  id: string;
  code: string;
  status: SalesJobOrderStatus;
  version: number;
  printCount: number;
  printedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  createdByName: string | null;
  salesOrder: SalesOrderDetail;
  customer: SalesCustomerRef;
  pickLines: SalesPickLine[];
  shipments: Array<{
    issueNo: string;
    issueDate: string;
    issuedAt: string;
    qty: number;
    boxCount: number;
    issuedByName: string | null;
  }>;
}

export interface SalesReport {
  summary: {
    orderCount: number;
    cancelledOrderCount: number;
    orderedQty: number;
    outstandingQty: number;
    shippedQty: number;
    shipmentCount: number;
    boxCount: number;
    customerCount: number;
  };
  byProduct: Array<SalesProductRef & { shippedQty: number; boxCount: number; orderCount: number }>;
  byCustomer: Array<SalesCustomerRef & { shippedQty: number; shipmentCount: number; orderCount: number }>;
  byDay: Array<{ date: string; shippedQty: number; shipmentCount: number }>;
  orderStatus: Array<{ status: SalesOrderStatus; count: number }>;
  items: Array<{
    id: string;
    issueNo: string;
    issueDate: string;
    issuedAt: string;
    qty: number;
    salesOrder: { id: string; code: string; customerPo: string | null };
    jobOrder: { id: string; code: string };
    customer: SalesCustomerRef;
    product: SalesProductRef;
    package: { qrCode: string; boxNo: number; lotNo: string };
    issuedByName: string | null;
  }>;
  meta: PageMeta;
}

function query(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

function auth(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  productId?: string;
}

export const listSalesOrders = (token: string, params: ListParams) =>
  apiFetch<{ items: SalesOrderListRow[]; meta: PageMeta }>(
    `/sales-orders${query({ ...params })}`,
    { headers: auth(token) },
  );

export const getSalesLookups = (token: string) =>
  apiFetch<SalesLookups>("/sales-orders/lookups", { headers: auth(token) });

export const getSalesOrder = (token: string, id: string) =>
  apiFetch<SalesOrderDetail>(`/sales-orders/${id}`, { headers: auth(token) });

export const createSalesOrder = (token: string, payload: SalesOrderPayload) =>
  apiFetch<SalesOrderDetail>("/sales-orders", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(payload),
  });

export const updateSalesOrder = (
  token: string,
  id: string,
  payload: SalesOrderPayload & { version: number },
) =>
  apiFetch<SalesOrderDetail>(`/sales-orders/${id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify(payload),
  });

export const deleteSalesOrder = (token: string, id: string, version: number) =>
  apiFetch<{ id: string; deleted: true }>(`/sales-orders/${id}?version=${version}`, {
    method: "DELETE",
    headers: auth(token),
  });

export const confirmSalesOrder = (token: string, id: string, version: number) =>
  apiFetch<SalesOrderDetail>(`/sales-orders/${id}/confirm`, {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ version }),
  });

export const cancelSalesOrder = (
  token: string,
  id: string,
  payload: { version: number; reason: string },
) =>
  apiFetch<SalesOrderDetail>(`/sales-orders/${id}/cancel`, {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(payload),
  });

export const listSalesJobOrders = (token: string, params: ListParams) =>
  apiFetch<{ items: SalesJobOrderListRow[]; meta: PageMeta }>(
    `/sales-job-orders${query({ ...params })}`,
    { headers: auth(token) },
  );

export const getSalesJobOrder = (token: string, id: string) =>
  apiFetch<SalesJobOrderDetail>(`/sales-job-orders/${id}`, { headers: auth(token) });

export const printSalesJobOrder = (token: string, id: string) =>
  apiFetch<SalesJobOrderDetail>(`/sales-job-orders/${id}/print`, {
    method: "POST",
    headers: auth(token),
  });

export const pickSalesJobOrder = (
  token: string,
  id: string,
  payload: { version: number; qrCode: string },
) =>
  apiFetch<SalesJobOrderDetail>(`/sales-job-orders/${id}/pick`, {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(payload),
  });

export const issueSalesJobOrder = (
  token: string,
  id: string,
  payload: {
    version: number;
    requestId: string;
    items: Array<{ reservationId: string; quantity: number }>;
  },
) =>
  apiFetch<SalesJobOrderDetail>(`/sales-job-orders/${id}/issue`, {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(payload),
  });

export const getSalesReport = (token: string, params: ListParams) =>
  apiFetch<SalesReport>(`/sales-reports${query({ ...params })}`, {
    headers: auth(token),
  });
