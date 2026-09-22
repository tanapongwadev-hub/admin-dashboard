"use client";

import {
  Ban,
  CheckCircle2,
  Eye,
  FileOutput,
  Pencil,
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

export function getProductionPlanRowActions(
  plan: ProductionPlan,
  permissions: {
    update: boolean;
    approve: boolean;
    issue: boolean;
    cancel: boolean;
    delete: boolean;
  },
  handlers: {
    view: () => void;
    edit: () => void;
    approve: () => void;
    issue: () => void;
    cancel: () => void;
    delete: () => void;
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
  if (plan.status === "APPROVED" && permissions.issue)
    actions.push({
      label: "ออกใบเบิก",
      icon: FileOutput,
      onSelect: handlers.issue,
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
  onIssue,
  onCancel,
  onDelete,
}: {
  plans: ProductionPlan[];
  permissions: {
    update: boolean;
    approve: boolean;
    issue: boolean;
    cancel: boolean;
    delete: boolean;
  };
  onView: (plan: ProductionPlan) => void;
  onEdit: (plan: ProductionPlan) => void;
  onApprove: (plan: ProductionPlan) => void;
  onIssue: (plan: ProductionPlan) => void;
  onCancel: (plan: ProductionPlan) => void;
  onDelete: (plan: ProductionPlan) => void;
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
              issue: () => onIssue(plan),
              cancel: () => onCancel(plan),
              delete: () => onDelete(plan),
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
