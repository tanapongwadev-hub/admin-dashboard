"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Material } from "@/lib/api/materials";

export function MaterialPcStatusDialog({
  material,
  onOpenChange,
  onConfirm,
}: {
  material: Material | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (material: Material) => void;
}) {
  if (!material) return null;
  const disabling = material.isActive;

  return (
    <ConfirmDialog
      open={!!material}
      onOpenChange={onOpenChange}
      variant={disabling ? "danger" : "default"}
      title={disabling ? "ปิดใช้งานวัสดุนี้หรือไม่?" : "เปิดใช้งานวัสดุนี้หรือไม่?"}
      description={
        disabling
          ? `"${material.name}" (${material.code}) จะไม่ปรากฏในรายการวัสดุที่ใช้งานอยู่อีกต่อไป ข้อมูลจะไม่ถูกลบ — คุณสามารถเปิดใช้งานได้อีกครั้งทุกเมื่อ`
          : `"${material.name}" (${material.code}) จะกลับมาใช้งานได้อีกครั้งในรายการและตัวเลือกวัสดุที่ใช้งานอยู่`
      }
      confirmLabel={disabling ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      onConfirm={() => onConfirm(material)}
    />
  );
}
