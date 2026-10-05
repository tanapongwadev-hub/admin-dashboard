import { apiFetch } from "./client";

export type ProductionOrderStatus = "IN_PROGRESS" | "COMPLETED";

export interface ProductionOrderLineSummary {
  id: string;
  lineNo: number;
  product: { id: string; code: string; name: string } | null;
  quantity: number;
  packingQuantity: number;
  packetCount: number;
  completedPacketCount: number;
}

export interface ProductionOrderSummary {
  id: string;
  code: string;
  productionPlanId: string;
  planCode: string | null;
  status: ProductionOrderStatus;
  createdAt: string;
  completedAt: string | null;
  packetCount: number;
  completedPacketCount: number;
  lines: ProductionOrderLineSummary[];
}

export interface ProductionOrderStep {
  index: number;
  code: string;
  name: string;
}

export interface ProductionOrderPacket {
  id: string;
  packetNo: number;
  qrCode: string;
  /** data: URL of the packet's QR image. */
  qrImage: string;
  quantity: number;
  status: ProductionOrderStatus;
  currentStepIndex: number;
  /** null once the packet has completed every step. */
  currentStep: ProductionOrderStep | null;
  stepUpdatedAt: string | null;
}

export interface ProductionOrderDetail
  extends Omit<ProductionOrderSummary, "lines"> {
  lines: Array<{
    id: string;
    lineNo: number;
    product: { id: string; code: string; name: string };
    quantity: number;
    packingQuantity: number;
    steps: ProductionOrderStep[];
    packets: ProductionOrderPacket[];
  }>;
}

export interface PaginatedProductionOrders {
  items: ProductionOrderSummary[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface ListProductionOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductionOrderStatus;
  planIds?: string[];
}

const auth = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export function listProductionOrders(
  accessToken: string,
  params: ListProductionOrdersParams = {},
) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.planIds?.length) query.set("planIds", params.planIds.join(","));
  const qs = query.size ? `?${query}` : "";
  return apiFetch<PaginatedProductionOrders>(`/production-orders${qs}`, {
    headers: auth(accessToken),
  });
}

export function getProductionOrder(accessToken: string, id: string) {
  return apiFetch<ProductionOrderDetail>(`/production-orders/${id}`, {
    headers: auth(accessToken),
  });
}

export function createProductionOrder(
  accessToken: string,
  productionPlanId: string,
) {
  return apiFetch<ProductionOrderDetail>("/production-orders", {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify({ productionPlanId }),
  });
}

export function advanceProductionOrderPacket(
  accessToken: string,
  packetId: string,
) {
  return apiFetch<ProductionOrderDetail>(
    `/production-orders/packets/${packetId}/advance`,
    { method: "POST", headers: auth(accessToken) },
  );
}
