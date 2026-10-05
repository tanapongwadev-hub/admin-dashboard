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
  /** Quantity already turned into boxes by output reports. */
  producedQuantity: number;
  /** Quantity closed short ("ปิดยอดค้าง"), never to be produced. */
  shortClosedQuantity: number;
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
  /** FULL = packing quantity; PARTIAL = remainder box of an output report. */
  unitType: "FULL" | "PARTIAL";
  /** Output report that created this box; null = legacy pre-created box. */
  outputId: string | null;
  /** Box this one was split off at a downstream step (partial production). */
  parentPacketId: string | null;
  status: ProductionOrderStatus;
  currentStepIndex: number;
  /** null once the packet has completed every step. */
  currentStep: ProductionOrderStep | null;
  stepUpdatedAt: string | null;
  /** Step-change history, oldest first (first entry = created at step 0). */
  timeline: ProductionOrderPacketEvent[];
}

export interface ProductionOrderPacketEvent {
  /** null = packet created */
  fromStepIndex: number | null;
  /** equals the workflow step count when the packet completed */
  toStepIndex: number;
  performedAt: string;
  performedBy: string | null;
}

/** "บันทึกผลผลิต" at the first workflow step — creates the boxes + QR. */
export interface ProductionOrderOutput {
  id: string;
  quantity: number;
  boxCount: number;
  /** YYYY-MM-DD */
  workDate: string;
  shift: string | null;
  remark: string | null;
  performedAt: string;
  performedBy: string | null;
}

export interface ProductionOrderDetailLine {
  id: string;
  lineNo: number;
  product: { id: string; code: string; name: string };
  quantity: number;
  packingQuantity: number;
  producedQuantity: number;
  shortClosedQuantity: number;
  shortCloseReason: string | null;
  shortClosedAt: string | null;
  /** Still on hold at the first step (not produced, not closed). */
  remainingQuantity: number;
  steps: ProductionOrderStep[];
  outputs: ProductionOrderOutput[];
  packets: ProductionOrderPacket[];
}

export interface ProductionOrderDetail
  extends Omit<ProductionOrderSummary, "lines"> {
  lines: ProductionOrderDetailLine[];
}

interface LineHoldCounters {
  id: string;
  producedQuantity: number;
  shortClosedQuantity: number;
  remainingQuantity: number;
  shortCloseReason?: string | null;
  shortClosedAt?: string | null;
}

export interface RecordOutputResult {
  orderId: string;
  orderStatus: ProductionOrderStatus;
  packetCount: number;
  completedPacketCount: number;
  line: LineHoldCounters;
  output: ProductionOrderOutput;
  packets: ProductionOrderPacket[];
}

export interface CloseRemainingResult {
  orderId: string;
  orderStatus: ProductionOrderStatus;
  packetCount: number;
  completedPacketCount: number;
  line: LineHoldCounters;
}

export interface RecordOutputPayload {
  quantity: number;
  workDate?: string;
  shift?: string;
  remark?: string;
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

export function recordProductionOrderOutput(
  accessToken: string,
  lineId: string,
  payload: RecordOutputPayload,
) {
  return apiFetch<RecordOutputResult>(
    `/production-orders/lines/${lineId}/output`,
    { method: "POST", headers: auth(accessToken), body: JSON.stringify(payload) },
  );
}

export function closeProductionOrderRemaining(
  accessToken: string,
  lineId: string,
  reason: string,
) {
  return apiFetch<CloseRemainingResult>(
    `/production-orders/lines/${lineId}/close-remaining`,
    {
      method: "POST",
      headers: auth(accessToken),
      body: JSON.stringify({ reason }),
    },
  );
}

/** Compact advance response: only the changed packet + order counters. */
export interface AdvancePacketResult {
  orderId: string;
  orderStatus: ProductionOrderStatus;
  packetCount: number;
  completedPacketCount: number;
  packet: Pick<
    ProductionOrderPacket,
    | "id"
    | "quantity"
    | "unitType"
    | "status"
    | "currentStepIndex"
    | "currentStep"
    | "stepUpdatedAt"
    | "timeline"
  >;
  /** Set when only part of the box was produced: the split-off box. */
  newPacket: ProductionOrderPacket | null;
}

/** Omit `quantity` to move the whole box; less = split (rest stays held). */
export function advanceProductionOrderPacket(
  accessToken: string,
  packetId: string,
  quantity?: number,
) {
  return apiFetch<AdvancePacketResult>(
    `/production-orders/packets/${packetId}/advance`,
    {
      method: "POST",
      headers: auth(accessToken),
      body: JSON.stringify(quantity === undefined ? {} : { quantity }),
    },
  );
}
