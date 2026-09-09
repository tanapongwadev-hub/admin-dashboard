"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Unit } from "@/lib/api/units";

// Wraps the shared `ConfirmDialog` for the soft-delete / restore action
// on a single Unit. Mirrors all other simple-master status dialogs:
// `variant="default"` for the non-destructive "เปิดใช้งาน" case
// and `variant="danger"` for "ปิดใช้งาน".

export function UnitsStatusDialog({
  unit,
  onOpenChange,
  onConfirm,
}: {
  unit: Unit | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (unit: Unit) => void;
}) {
  if (!unit) return null;
  const disabling = unit.isActive;

  return (
    <ConfirmDialog
      open={!!unit}
      onOpenChange={onOpenChange}
      variant={disabling ? "danger" : "default"}
      title={disabling ? "ปิดใช้งานหน่วยนับนี้หรือไม่?" : "เปิดใช้งานหน่วยนับนี้หรือไม่?"}
      description={
        disabling
          ? `"${unit.nameTh}" (${unit.code}) จะไม่ปรากฏในรายการหน่วยนับที่ใช้งานอยู่อีกต่อไป ข้อมูลจะไม่ถูกลบ — คุณสามารถเปิดใช้งานได้อีกครั้งทุกเมื่อ`
          : `"${unit.nameTh}" (${unit.code}) จะกลับมาใช้งานได้อีกครั้งในรายการและตัวเลือกหน่วยนับที่ใช้งานอยู่`
      }
      confirmLabel={disabling ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      onConfirm={() => onConfirm(unit)}
    />
  );
}
