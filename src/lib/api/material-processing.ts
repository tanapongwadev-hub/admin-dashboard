import { apiFetch } from "./client";
import type { MaterialReceiving, MaterialReceivingLookups } from "./materials-receiving";

export type ProcessingStatus = "WAITING" | "PARTIAL" | "PROCESSED";
export interface ProcessingSource {
  id: string;
  internalLotNo: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialType: string;
  unit: string;
  receiveDate: string;
  receiveQuantity: string;
  processedQuantity: string;
  remainingQuantity: string;
  availableQuantity: string;
  canProcessUnits: boolean;
  processingStatus: ProcessingStatus;
}
export interface ProcessingPayload {
  requestKey: string;
  sourceReceivingId: string;
  targetMaterialId: string;
  sourceQuantity: number;
  piecesPerUnit: number;
  scrapQuantity: number;
  packingQuantity: number;
  remark?: string;
}
export interface ProcessingResult {
  id: string;
  code: string;
  outputReceivingId: string;
  outputQuantity: string;
}
export interface ProcessingHistory extends ProcessingResult {
  sourceQuantity: string;
  piecesPerUnit: number;
  scrapQuantity: number;
  packingQuantity: number;
  outputLotNo: string;
  targetMaterialCode: string;
  targetMaterialName: string;
  packageCount: number;
  sourcePackages: { packageId: string; lotDetailNo: string | null; quantity: string }[];
  createdAt: string;
  remark: string | null;
}
export interface ProcessingList {
  items: ProcessingSource[];
  meta: { page: number; totalPages: number; totalItems: number; limit: number };
}

export function listMaterialProcessing(token: string, params: { page: number; search?: string; status?: ProcessingStatus }) {
  const query = new URLSearchParams({ page: String(params.page), limit: "20" });
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  return apiFetch<ProcessingList>(`/material-processing?${query}`, { headers: { Authorization: `Bearer ${token}` } });
}
export function getProcessingLookups(token: string) {
  return apiFetch<MaterialReceivingLookups>("/material-processing/lookups", { headers: { Authorization: `Bearer ${token}` } });
}
export function createMaterialProcessing(token: string, payload: ProcessingPayload) {
  return apiFetch<ProcessingResult>("/material-processing", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
}
export function getProcessingHistory(token: string, receivingId: string) {
  return apiFetch<ProcessingHistory[]>(`/material-processing/receivings/${encodeURIComponent(receivingId)}/history`, { headers: { Authorization: `Bearer ${token}` } });
}
export function getProcessingOutput(token: string, receivingId: string) {
  return apiFetch<MaterialReceiving>(`/material-processing/outputs/${encodeURIComponent(receivingId)}`, { headers: { Authorization: `Bearer ${token}` } });
}
