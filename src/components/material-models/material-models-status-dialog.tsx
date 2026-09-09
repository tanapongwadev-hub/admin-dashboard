"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { MaterialModel } from "@/lib/api/material-models";

// Wraps the shared `ConfirmDialog` for the soft-delete / restore action
// on a single Material Model. Mirrors CategoriesStatusDialog's /
// LoadingPointsStatusDialog's / DeliveryTypesStatusDialog's /
// RejectReasonsStatusDialog's shape exactly — same `variant="default"` for
// the non-destructive "เปิดใช้งาน" case (re-enabling isn't destructive)
// and `variant="danger"` for "ปิดใช้งาน". See `AGENTS.md` § Row actions
// for the rule on which variant to use.

export function MaterialModelsStatusDialog({
  materialModel,
  onOpenChange,
  onConfirm,
}: {
  materialModel: MaterialModel | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (materialModel: MaterialModel) => void;
}) {
  if (!materialModel) return null;
  const disabling = materialModel.isActive;

  return (
    <ConfirmDialog
      open={!!materialModel}
      onOpenChange={onOpenChange}
      variant={disabling ? "danger" : "default"}
      title={disabling ? "ปิดใช้งานรุ่นวัสดุนี้หรือไม่?" : "เปิดใช้งานรุ่นวัสดุนี้หรือไม่?"}
      description={
        disabling
          ? `"${materialModel.nameTh}" (${materialModel.code}) จะไม่ปรากฏในรายการรุ่นวัสดุที่ใช้งานอยู่อีกต่อไป ข้อมูลจะไม่ถูกลบ — คุณสามารถเปิดใช้งานได้อีกครั้งทุกเมื่อ`
          : `"${materialModel.nameTh}" (${materialModel.code}) จะกลับมาใช้งานได้อีกครั้งในรายการและตัวเลือกรุ่นวัสดุที่ใช้งานอยู่`
      }
      confirmLabel={disabling ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      onConfirm={() => onConfirm(materialModel)}
    />
  );
}
