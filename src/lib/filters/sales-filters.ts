import type { SalesJobOrderStatus, SalesOrderStatus } from "@/lib/api/sales";

// One canonical URL-filter shape shared by the three sales pages (orders,
// job orders, report). Each page only shows the controls whose keys it
// supports; unknown/invalid values parse to "" so a hand-edited URL never
// reaches the API.

export interface SalesFilterState {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  customerId: string;
  productId: string;
}

export const SALES_ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว รอจัดส่ง",
  PARTIALLY_SHIPPED: "ส่งบางส่วน",
  SHIPPED: "ส่งครบแล้ว",
  CANCELLED: "ยกเลิก",
};

export const SALES_JOB_ORDER_STATUS_LABELS: Record<SalesJobOrderStatus, string> = {
  WAITING_PICKING: "รอหยิบสินค้า",
  READY_TO_ISSUE: "พร้อมตัดสต็อก",
  PARTIALLY_ISSUED: "ตัดสต็อกบางส่วน",
  ISSUED: "ตัดสต็อกครบแล้ว",
  CANCELLED: "ยกเลิก",
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[1-9]\d*$/;

export function readSalesFilters(
  params: URLSearchParams | Record<string, string | undefined>,
  statuses: readonly string[],
): SalesFilterState {
  const get = (key: string) =>
    (params instanceof URLSearchParams ? params.get(key) : params[key]) ?? "";
  const status = get("status");
  const dateFrom = get("dateFrom");
  const dateTo = get("dateTo");
  const customerId = get("customerId");
  const productId = get("productId");
  return {
    search: get("search").trim(),
    status: statuses.includes(status) ? status : "",
    dateFrom: DATE.test(dateFrom) ? dateFrom : "",
    dateTo: DATE.test(dateTo) ? dateTo : "",
    customerId: ID.test(customerId) ? customerId : "",
    productId: ID.test(productId) ? productId : "",
  };
}

export function formatThaiDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

export function formatThaiDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

export interface SalesFilterChip {
  key: keyof SalesFilterState;
  /** Extra keys cleared together with `key` (a date range is one chip). */
  alsoClear?: (keyof SalesFilterState)[];
  label: string;
}

export function buildSalesChips(
  filters: SalesFilterState,
  options: {
    statusLabels?: Record<string, string>;
    customers?: Array<{ id: string; code: string; nameTh: string }>;
    products?: Array<{ id: string; code: string; name: string }>;
    dateLabel?: string;
  } = {},
): SalesFilterChip[] {
  const chips: SalesFilterChip[] = [];
  if (filters.status) {
    chips.push({
      key: "status",
      label: `สถานะ: ${options.statusLabels?.[filters.status] ?? filters.status}`,
    });
  }
  if (filters.customerId) {
    const c = options.customers?.find((x) => x.id === filters.customerId);
    chips.push({ key: "customerId", label: `ลูกค้า: ${c ? `${c.code} · ${c.nameTh}` : filters.customerId}` });
  }
  if (filters.productId) {
    const p = options.products?.find((x) => x.id === filters.productId);
    chips.push({ key: "productId", label: `สินค้า: ${p ? p.code : filters.productId}` });
  }
  if (filters.dateFrom || filters.dateTo) {
    chips.push({
      key: "dateFrom",
      alsoClear: ["dateTo"],
      label: `${options.dateLabel ?? "วันที่"}: ${filters.dateFrom ? formatThaiDate(filters.dateFrom) : "…"} – ${filters.dateTo ? formatThaiDate(filters.dateTo) : "…"}`,
    });
  }
  return chips;
}
