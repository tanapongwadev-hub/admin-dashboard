import { apiFetch } from "./client";

// Lot-model production (cps-api modules/production). Plan:
// docs/plans/2026-10-05-production-lot-traceability-plan.md

export type Shift = "A" | "B";

export interface BoardLot {
  id: string;
  lotNo: string;
  lotType: "ORIGIN" | "PROCESS" | "FG" | "STORE";
  producedQty: number;
  remainingQty: number;
  /** YYYY-MM-DD */
  productionDate: string;
  shift: string;
  status: "OPEN" | "CONSUMED" | "REVERSED";
}

export interface BoardStep {
  stepIndex: number;
  code: string;
  name: string;
  receivingType: "NONE" | "FG" | "STORE";
  inputQty: number;
  producedQty: number;
  /** Arrived, waiting to be produced. */
  waitingQty: number;
  /** Produced, not yet transferred (at a receiving step: not yet packed). */
  readyQty: number;
  transferredQty: number;
  rejectedQty: number;
  closedQty: number;
  lots: BoardLot[];
}

export interface LineBoard {
  line: {
    id: string;
    lineNo: number;
    orderId: string;
    orderCode: string | null;
    product: { id: string; code: string; name: string } | null;
    plannedQty: number;
    producedQty: number;
    receivedQty: number;
    rejectedQty: number;
    shortClosedQty: number;
  };
  steps: BoardStep[];
}

export interface ProducePayload {
  requestId: string;
  goodQty: number;
  rejects?: Array<{ reasonId: string; qty: number }>;
  productionDate?: string;
  shift?: Shift;
  remark?: string;
}

export interface ProduceResult {
  replayed: boolean;
  lot: {
    id: string;
    lotNo: string;
    lotType: string;
    producedQty: number;
    remainingQty: number;
    productionDate: string;
    shift: string;
    isNew: boolean;
    origins: Array<{ lotNo: string; qty: number; qtyRemaining: number }>;
  } | null;
  step: { stepIndex: number; code: string; name: string; waitingQty: number };
}

export interface TransferPayload {
  requestId: string;
  qty: number;
  allocationMode?: "FIFO" | "MANUAL";
  allocations?: Array<{ lotId: string; qty: number }>;
  transferDate?: string;
  shift?: Shift;
  remark?: string;
}

export interface TransferResult {
  replayed: boolean;
  fromStep: { stepIndex: number; code: string; readyQty: number };
  toStep: { stepIndex: number; code: string; waitingQty: number };
  transfers: Array<{ lotNo: string; qty: number; origins: Array<{ lotNo: string; qty: number }> }>;
}

export interface OriginShare {
  lotNo: string;
  productionDate: string;
  shift: string;
  qty: number;
}

export interface PackageView {
  id: string;
  qrCode: string;
  /** data: URL (SVG) */
  qrImage: string;
  boxNo: number;
  unitType: "FULL" | "PARTIAL";
  initialQty: number;
  currentQty: number;
  status: string;
  origins: OriginShare[];
}

export interface GeneratePackagesResult {
  replayed: boolean;
  fgLot: { id: string; lotNo: string; producedQty: number; remainingQty: number };
  packages: PackageView[];
}

export interface TraceNode {
  lotId: string;
  lotNo: string;
  lotType: string;
  stepIndex: number;
  processCode: string;
  productionDate: string;
  shift: string;
  producedQty: number;
  remainingQty: number;
  /** Pieces that flowed along the lot-to-lot edge (null at the root). */
  edgeQty: number | null;
  origins: Array<OriginShare & { qtyRemaining: number }>;
  links: TraceNode[];
  packages?: Array<{ qrCode: string; boxNo: number; qty: number; status: string; origins: OriginShare[] }>;
}

interface TraceContext {
  product: { id: string; code: string; name: string };
  productionOrder: { id: string; code: string };
  productionPlan: string | null;
  lineNo: number;
  plannedQty: number;
}

export type ScanResult =
  | (TraceContext & {
      kind: "PACKAGE";
      qrCode: string;
      boxNo: number;
      unitType: "FULL" | "PARTIAL";
      qty: number;
      currentQty: number;
      status: string;
      packedAt: string;
      receivedDate: string;
      origins: OriginShare[];
      lineage: TraceNode;
    })
  | (TraceContext & { kind: "LOT"; direction: "backward" | "forward"; lineage: TraceNode });

export type LotTrace = TraceContext & { direction: "backward" | "forward"; lineage: TraceNode };

const auth = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export function getLineBoard(accessToken: string, lineId: string) {
  return apiFetch<LineBoard>(`/production/lines/${lineId}/board`, { headers: auth(accessToken) });
}

export function produceAtStep(accessToken: string, lineId: string, stepIndex: number, payload: ProducePayload) {
  return apiFetch<ProduceResult>(`/production/lines/${lineId}/steps/${stepIndex}/produce`, {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function transferFromStep(accessToken: string, lineId: string, stepIndex: number, payload: TransferPayload) {
  return apiFetch<TransferResult>(`/production/lines/${lineId}/steps/${stepIndex}/transfer`, {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function generatePackages(
  accessToken: string,
  payload: { requestId: string; fgLotId: string; qty?: number; packSize?: number },
) {
  return apiFetch<GeneratePackagesResult>("/production/packages/generate", {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function listLotPackages(accessToken: string, lotId: string) {
  return apiFetch<PackageView[]>(`/production/lots/${lotId}/packages`, { headers: auth(accessToken) });
}

export function scanTrace(accessToken: string, code: string) {
  return apiFetch<ScanResult>(`/production/traceability/scan?q=${encodeURIComponent(code)}`, {
    headers: auth(accessToken),
  });
}

export function traceLot(accessToken: string, lotId: string, direction: "backward" | "forward") {
  return apiFetch<LotTrace>(`/production/lots/${lotId}/traceability?direction=${direction}`, {
    headers: auth(accessToken),
  });
}
