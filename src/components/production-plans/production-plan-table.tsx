"use client";

import {
  Ban,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Pencil,
  Printer,
  Trash2,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RowActionsMenu,
  type RowAction,
} from "@/components/ui/row-actions-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  MaterialJobOrderStatus,
  ProductionPlan,
  ProductionPlanStatus,
} from "@/lib/api/production-plans";

const STATUS: Record<
  ProductionPlanStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  DRAFT: { label: "ร่าง", variant: "warning" },
  APPROVED: { label: "อนุมัติแล้ว", variant: "info" },
  ISSUED: { label: "เบิกแล้ว", variant: "success" },
  CANCELLED: { label: "ยกเลิก", variant: "neutral" },
  EXPIRED: { label: "หมดอายุ", variant: "danger" },
};

export const JOB_ORDER_STATUS: Record<
  MaterialJobOrderStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  WAITING_PICKING: { label: "รอหยิบสินค้า", variant: "warning" },
  READY_TO_ISSUE: { label: "พร้อมจ่ายออก", variant: "info" },
  PARTIALLY_ISSUED: { label: "จ่ายออกบางส่วน", variant: "info" },
  ISSUED: { label: "จ่ายออกครบแล้ว", variant: "success" },
  CANCELLED: { label: "ยกเลิก", variant: "neutral" },
};

export function getProductionPlanRowActions(
  plan: ProductionPlan,
  permissions: {
    update: boolean;
    approve: boolean;
    cancel: boolean;
    delete: boolean;
    viewJobOrder: boolean;
    printJobOrder: boolean;
  },
  handlers: {
    view: () => void;
    edit: () => void;
    approve: () => void;
    cancel: () => void;
    delete: () => void;
    viewJobOrder: () => void;
    printJobOrder: () => void;
  },
): RowAction[] {
  const actions: RowAction[] = [
    { label: "ดูรายละเอียด", icon: Eye, onSelect: handlers.view },
  ];
  if (plan.status === "DRAFT" && permissions.update)
    actions.push({ label: "แก้ไข", icon: Pencil, onSelect: handlers.edit });
  if (plan.status === "DRAFT" && permissions.approve)
    actions.push({
      label: "อนุมัติและกันสต็อก",
      icon: CheckCircle2,
      onSelect: handlers.approve,
    });
  if (plan.jobOrder && permissions.viewJobOrder)
    actions.push({
      label: "ดูใบจัดงาน",
      icon: ClipboardCheck,
      onSelect: handlers.viewJobOrder,
    });
  if (
    plan.jobOrder &&
    plan.jobOrder.status !== "CANCELLED" &&
    permissions.printJobOrder
  )
    actions.push({
      label: "พิมพ์ใบจัดงาน",
      icon: Printer,
      onSelect: handlers.printJobOrder,
    });
  if (
    (plan.status === "DRAFT" || plan.status === "APPROVED") &&
    permissions.cancel
  )
    actions.push({
      label: "ยกเลิกแผน",
      icon: Ban,
      onSelect: handlers.cancel,
      variant: "danger",
    });
  if (plan.status === "DRAFT" && permissions.delete)
    actions.push({
      label: "ลบร่าง",
      icon: Trash2,
      onSelect: handlers.delete,
      variant: "danger",
    });
  return actions;
}

function date(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}
function needBy(plan: ProductionPlan) {
  const values = plan.lines.map((line) => line.needByDate).sort();
  return values.length
    ? values[0] === values.at(-1)
      ? date(values[0])
      : `${date(values[0])} – ${date(values.at(-1)!)}`
    : "—";
}

export function ProductionPlanTable({
  plans,
  permissions,
  onView,
  onEdit,
  onApprove,
  onCancel,
  onDelete,
  onViewJobOrder,
  onPrintJobOrder,
}: {
  plans: ProductionPlan[];
  permissions: {
    update: boolean;
    approve: boolean;
    cancel: boolean;
    delete: boolean;
    viewJobOrder: boolean;
    printJobOrder: boolean;
  };
  onView: (plan: ProductionPlan) => void;
  onEdit: (plan: ProductionPlan) => void;
  onApprove: (plan: ProductionPlan) => void;
  onCancel: (plan: ProductionPlan) => void;
  onDelete: (plan: ProductionPlan) => void;
  onViewJobOrder: (plan: ProductionPlan) => void;
  onPrintJobOrder: (plan: ProductionPlan) => void;
}) {
  if (!plans.length)
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <p className="font-medium text-fg">ยังไม่มีแผนการผลิต</p>
        <p className="mt-1 text-sm text-fg-muted">
          สร้างแผนใหม่หรือนำเข้าจาก Excel เพื่อเริ่มต้น
        </p>
      </div>
    );
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>เลขแผน</TableHead>
            <TableHead>ชื่อแผน</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>ใบจัดงาน</TableHead>
            <TableHead>รายการสินค้า</TableHead>
            <TableHead>จำนวนรวม</TableHead>
            <TableHead>วันที่ต้องการใช้</TableHead>
            <TableHead className="w-14">
              <span className="sr-only">การทำงาน</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => {
            const actions = getProductionPlanRowActions(plan, permissions, {
              view: () => onView(plan),
              edit: () => onEdit(plan),
              approve: () => onApprove(plan),
              cancel: () => onCancel(plan),
              delete: () => onDelete(plan),
              viewJobOrder: () => onViewJobOrder(plan),
              printJobOrder: () => onPrintJobOrder(plan),
            });
            return (
              <TableRow key={plan.id}>
                <TableCell>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 font-mono text-sm"
                    onClick={() => onView(plan)}
                  >
                    {plan.code}
                  </Button>
                </TableCell>
                <TableCell className="max-w-64 truncate">
                  {plan.title || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS[plan.status].variant} dot>
                    {STATUS[plan.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {plan.jobOrder ? (
                    <button
                      type="button"
                      onClick={() => onViewJobOrder(plan)}
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      <Badge
                        variant={JOB_ORDER_STATUS[plan.jobOrder.status].variant}
                        dot
                      >
                        {JOB_ORDER_STATUS[plan.jobOrder.status].label}
                      </Badge>
                    </button>
                  ) : (
                    <span className="text-fg-muted">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {plan.lines.length.toLocaleString("th-TH")}
                </TableCell>
                <TableCell className="tabular-nums">
                  {plan.lines
                    .reduce((sum, line) => sum + line.quantity, 0)
                    .toLocaleString("th-TH")}
                </TableCell>
                <TableCell>{needBy(plan)}</TableCell>
                <TableCell>
                  <RowActionsMenu actions={actions} itemLabel={plan.code} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export const PRODUCTION_PLAN_STATUS_DISPLAY = STATUS;
