import { Badge } from "@/components/ui/badge";
import type { SalesJobOrderStatus, SalesOrderStatus } from "@/lib/api/sales";
import {
  SALES_JOB_ORDER_STATUS_LABELS,
  SALES_ORDER_STATUS_LABELS,
} from "@/lib/filters/sales-filters";

// One explicit case per status (no fall-through to a "happy" color).
const ORDER_VARIANT: Record<SalesOrderStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  DRAFT: "neutral",
  CONFIRMED: "info",
  PARTIALLY_SHIPPED: "warning",
  SHIPPED: "success",
  CANCELLED: "danger",
};

const JOB_VARIANT: Record<SalesJobOrderStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  WAITING_PICKING: "neutral",
  READY_TO_ISSUE: "info",
  PARTIALLY_ISSUED: "warning",
  ISSUED: "success",
  CANCELLED: "danger",
};

export function SalesOrderStatusBadge({ status }: { status: SalesOrderStatus }) {
  return (
    <Badge variant={ORDER_VARIANT[status]} dot>
      {SALES_ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function SalesJobOrderStatusBadge({ status }: { status: SalesJobOrderStatus }) {
  return (
    <Badge variant={JOB_VARIANT[status]} dot>
      {SALES_JOB_ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
