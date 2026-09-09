"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Supplier } from "@/lib/api/suppliers";

// Wraps the shared `ConfirmDialog` for the soft-delete / restore action
// on a single Supplier. Mirrors CategoriesStatusDialog's /
// LoadingPointsStatusDialog's / DeliveryTypesStatusDialog's /
// RejectReasonsStatusDialog's / MaterialModelsStatusDialog's shape
// exactly — same `variant="default"` for the non-destructive
// "เปิดใช้งาน" case (re-enabling isn't destructive) and
// `variant="danger"` for "ปิดใช้งาน". See `AGENTS.md` § Row actions
// for the rule on which variant to use.

export function SuppliersStatusDialog({
  supplier,
  onOpenChange,
  onConfirm,
}: {
  supplier: Supplier | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (supplier: Supplier) => void;
}) {
  if (!supplier) return null;
  const disabling = supplier.isActive;

  return (
    <ConfirmDialog
      open={!!supplier}
      onOpenChange={onOpenChange}
      variant={disabling ? "danger" : "default"}
      title={disabling ? "ปิดใช้งานผู้จัดจำหน่ายนี้หรือไม่?" : "เปิดใช้งานผู้จัดจำหน่ายนี้หรือไม่?"}
      description={
        disabling
          ? `"${supplier.nameTh}" (${supplier.code}) จะไม่ปรากฏในรายการผู้จัดจำหน่ายที่ใช้งานอยู่อีกต่อไป ข้อมูลจะไม่ถูกลบ — คุณสามารถเปิดใช้งานได้อีกครั้งทุกเมื่อ`
          : `"${supplier.nameTh}" (${supplier.code}) จะกลับมาใช้งานได้อีกครั้งในรายการและตัวเลือกผู้จัดจำหน่ายที่ใช้งานอยู่`
      }
      confirmLabel={disabling ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      onConfirm={() => onConfirm(supplier)}
    />
  );
}
