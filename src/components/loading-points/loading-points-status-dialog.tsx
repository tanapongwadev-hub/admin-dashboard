"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { LoadingPoint } from "@/lib/api/loading-points";

// Wraps the shared `ConfirmDialog` for the soft-delete / restore action
// on a single Loading Point. Mirrors CategoriesStatusDialog's shape
// exactly — same `variant="default"` for the non-destructive "เปิดใช้งาน"
// case (re-enabling isn't destructive) and `variant="danger"` for
// "ปิดใช้งาน". See `AGENTS.md` § Row actions for the rule on which
// variant to use.

export function LoadingPointsStatusDialog({
  loadingPoint,
  onOpenChange,
  onConfirm,
}: {
  loadingPoint: LoadingPoint | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (loadingPoint: LoadingPoint) => void;
}) {
  if (!loadingPoint) return null;
  const disabling = loadingPoint.isActive;

  return (
    <ConfirmDialog
      open={!!loadingPoint}
      onOpenChange={onOpenChange}
      variant={disabling ? "danger" : "default"}
      title={disabling ? "ปิดใช้งานจุดขนถ่ายนี้หรือไม่?" : "เปิดใช้งานจุดขนถ่ายนี้หรือไม่?"}
      description={
        disabling
          ? `"${loadingPoint.nameTh}" (${loadingPoint.code}) จะไม่ปรากฏในรายการจุดขนถ่ายที่ใช้งานอยู่อีกต่อไป ข้อมูลจะไม่ถูกลบ — คุณสามารถเปิดใช้งานได้อีกครั้งทุกเมื่อ`
          : `"${loadingPoint.nameTh}" (${loadingPoint.code}) จะกลับมาใช้งานได้อีกครั้งในรายการและตัวเลือกจุดขนถ่ายที่ใช้งานอยู่`
      }
      confirmLabel={disabling ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      onConfirm={() => onConfirm(loadingPoint)}
    />
  );
}
