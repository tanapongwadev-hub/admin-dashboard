import type { ProductionPlanStatus } from "@/lib/api/production-plans";

export interface ProductionPlansFilterState {
  search: string;
  status: "all" | ProductionPlanStatus;
  needByDateFrom: string;
  needByDateTo: string;
}

export const PRODUCTION_PLAN_FILTER_KEYS: (keyof ProductionPlansFilterState)[] =
  ["search", "status", "needByDateFrom", "needByDateTo"];

export function readProductionPlansFilters(
  params: URLSearchParams,
): ProductionPlansFilterState {
  const status = params.get("status");
  const statuses: ProductionPlanStatus[] = [
    "DRAFT",
    "APPROVED",
    "ISSUED",
    "CANCELLED",
    "EXPIRED",
  ];
  return {
    search: params.get("search") ?? "",
    status: statuses.includes(status as ProductionPlanStatus)
      ? (status as ProductionPlanStatus)
      : "all",
    needByDateFrom: params.get("needByDateFrom") ?? "",
    needByDateTo: params.get("needByDateTo") ?? "",
  };
}

const STATUS_LABELS: Record<ProductionPlanStatus, string> = {
  DRAFT: "ร่าง",
  APPROVED: "อนุมัติแล้ว",
  ISSUED: "เบิกแล้ว",
  CANCELLED: "ยกเลิก",
  EXPIRED: "หมดอายุ",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function buildProductionPlansChips(filters: ProductionPlansFilterState) {
  const chips: Array<{ key: keyof ProductionPlansFilterState; label: string }> =
    [];
  if (filters.status !== "all")
    chips.push({
      key: "status",
      label: `สถานะ: ${STATUS_LABELS[filters.status]}`,
    });
  if (filters.needByDateFrom || filters.needByDateTo) {
    chips.push({
      key: "needByDateFrom",
      label: `ต้องการใช้: ${filters.needByDateFrom ? formatDate(filters.needByDateFrom) : "…"} – ${filters.needByDateTo ? formatDate(filters.needByDateTo) : "…"}`,
    });
  }
  return chips;
}
