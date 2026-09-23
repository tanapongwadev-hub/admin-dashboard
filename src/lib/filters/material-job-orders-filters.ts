import type { MaterialJobOrderStatus } from "@/lib/api/production-plans";

export interface MaterialJobOrdersFilterState {
  search: string;
  status: "all" | MaterialJobOrderStatus;
  approvedDateFrom: string;
  approvedDateTo: string;
}

export const MATERIAL_JOB_ORDER_STATUSES: MaterialJobOrderStatus[] = [
  "WAITING_PICKING",
  "READY_TO_ISSUE",
  "PARTIALLY_ISSUED",
  "ISSUED",
  "CANCELLED",
];

export function readMaterialJobOrdersFilters(
  params: URLSearchParams,
): MaterialJobOrdersFilterState {
  const status = params.get("status");
  return {
    search: params.get("search") ?? "",
    status: MATERIAL_JOB_ORDER_STATUSES.includes(
      status as MaterialJobOrderStatus,
    )
      ? (status as MaterialJobOrderStatus)
      : "all",
    approvedDateFrom: params.get("approvedDateFrom") ?? "",
    approvedDateTo: params.get("approvedDateTo") ?? "",
  };
}

const STATUS_LABELS: Record<MaterialJobOrderStatus, string> = {
  WAITING_PICKING: "รอหยิบสินค้า",
  READY_TO_ISSUE: "พร้อมจ่ายออก",
  PARTIALLY_ISSUED: "จ่ายออกบางส่วน",
  ISSUED: "จ่ายออกครบแล้ว",
  CANCELLED: "ยกเลิก",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function buildMaterialJobOrdersChips(
  filters: MaterialJobOrdersFilterState,
) {
  const chips: Array<{
    key: keyof MaterialJobOrdersFilterState;
    label: string;
  }> = [];
  if (filters.status !== "all")
    chips.push({
      key: "status",
      label: `สถานะ: ${STATUS_LABELS[filters.status]}`,
    });
  if (filters.approvedDateFrom || filters.approvedDateTo) {
    chips.push({
      key: "approvedDateFrom",
      label: `อนุมัติเมื่อ: ${filters.approvedDateFrom ? formatDate(filters.approvedDateFrom) : "…"} – ${filters.approvedDateTo ? formatDate(filters.approvedDateTo) : "…"}`,
    });
  }
  return chips;
}
