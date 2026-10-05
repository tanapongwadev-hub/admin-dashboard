"use client";

import { ClipboardCheck, ClipboardList, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";

// Pure builder (R4: row actions are a get<Resource>RowActions function).
// Permission flags mirror the destination pages' own gates.
export function getProcessOrderRowActions(
  plan: { code: string; jobOrderId: string | null },
  permissions: { canViewJobOrder: boolean; canPrintJobOrder: boolean; canViewPlan: boolean },
  go: (href: string) => void,
): RowAction[] {
  const actions: RowAction[] = [];
  if (plan.jobOrderId && permissions.canViewJobOrder) {
    actions.push({
      label: "ดูใบจัดงาน",
      icon: ClipboardCheck,
      onSelect: () => go(`/materials/job-orders/${plan.jobOrderId}`),
    });
  }
  if (plan.jobOrderId && permissions.canPrintJobOrder) {
    actions.push({
      label: "พิมพ์ใบจัดงาน",
      icon: Printer,
      onSelect: () => go(`/materials/job-orders/${plan.jobOrderId}?print=1`),
    });
  }
  if (permissions.canViewPlan) {
    actions.push({
      label: "ดูแผนการผลิต",
      icon: ClipboardList,
      onSelect: () => go(`/production/plans?search=${encodeURIComponent(plan.code)}`),
    });
  }
  return actions;
}

export function ProcessOrderRowActions({
  plan,
  permissions,
}: {
  plan: { code: string; jobOrderId: string | null };
  permissions: { canViewJobOrder: boolean; canPrintJobOrder: boolean; canViewPlan: boolean };
}) {
  const router = useRouter();
  return (
    <RowActionsMenu
      itemLabel={plan.code}
      actions={getProcessOrderRowActions(plan, permissions, (href) => router.push(href))}
    />
  );
}
