"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { DeliveryType } from "@/lib/api/delivery-types";

// Wraps the shared `ConfirmDialog` for the soft-delete / restore action
// on a single Delivery Type. Mirrors CategoriesStatusDialog's /
// LoadingPointsStatusDialog's shape exactly — same `variant="default"`
// for the non-destructive "เปิดใช้งาน" case (re-enabling isn't
// destructive) and `variant="danger"` for "ปิดใช้งาน". See `AGENTS.md`
// § Row actions for the rule on which variant to use.

export function DeliveryTypesStatusDialog({
  deliveryType,
  onOpenChange,
  onConfirm,
}: {
  deliveryType: DeliveryType | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deliveryType: DeliveryType) => void;
}) {
  if (!deliveryType) return null;
  const disabling = deliveryType.isActive;

  return (
    <ConfirmDialog
      open={!!deliveryType}
      onOpenChange={onOpenChange}
      variant={disabling ? "danger" : "default"}
      title={disabling ? "ปิดใช้งานประเภทการจัดส่งนี้หรือไม่?" : "เปิดใช้งานประเภทการจัดส่งนี้หรือไม่?"}
      description={
        disabling
          ? `"${deliveryType.nameTh}" (${deliveryType.code}) จะไม่ปรากฏในรายการประเภทการจัดส่งที่ใช้งานอยู่อีกต่อไป ข้อมูลจะไม่ถูกลบ — คุณสามารถเปิดใช้งานได้อีกครั้งทุกเมื่อ`
          : `"${deliveryType.nameTh}" (${deliveryType.code}) จะกลับมาใช้งานได้อีกครั้งในรายการและตัวเลือกประเภทการจัดส่งที่ใช้งานอยู่`
      }
      confirmLabel={disabling ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      onConfirm={() => onConfirm(deliveryType)}
    />
  );
}
