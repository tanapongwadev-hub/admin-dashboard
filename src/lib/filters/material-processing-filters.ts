import type { ProcessingStatus } from "@/lib/api/material-processing";

export const PROCESSING_STATUS_LABELS: Record<ProcessingStatus, string> = {
  WAITING: "รอแปรรูป", PARTIAL: "แปรรูปบางส่วน", PROCESSED: "แปรรูปแล้ว",
};
export function readProcessingFilters(params: URLSearchParams): { search: string; status: ProcessingStatus | "" } {
  const status = params.get("status");
  return { search: (params.get("search") ?? "").slice(0, 100), status: status === "WAITING" || status === "PARTIAL" || status === "PROCESSED" ? status : "" };
}
export function buildProcessingChips(filters: ReturnType<typeof readProcessingFilters>) {
  const chips: { key: "search" | "status"; label: string }[] = [];
  if (filters.search) chips.push({ key: "search", label: `ค้นหา: ${filters.search}` });
  if (filters.status) chips.push({ key: "status", label: `สถานะ: ${PROCESSING_STATUS_LABELS[filters.status]}` });
  return chips;
}
