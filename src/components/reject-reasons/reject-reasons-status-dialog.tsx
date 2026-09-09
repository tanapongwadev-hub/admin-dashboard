"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { RejectReason } from "@/lib/api/reject-reasons";

// Wraps the shared `ConfirmDialog` for the soft-delete / restore action
// on a single Reject Reason. Mirrors CategoriesStatusDialog's /
// LoadingPointsStatusDialog's / DeliveryTypesStatusDialog's shape
// exactly — same `variant="default"` for the non-destructive "เปิดใช้งาน"
// case (re-enabling isn't destructive) and `variant="danger"` for
// "ปิดใช้งาน". See `AGENTS.md` § Row actions for the rule on which
// variant to use.

export function RejectReasonsStatusDialog({
  rejectReason,
  onOpenChange,
  onConfirm,
}: {
  rejectReason: RejectReason | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (rejectReason: RejectReason) => void;
}) {
  if (!rejectReason) return null;
  const disabling = rejectReason.isActive;

  return (
    <ConfirmDialog
      open={!!rejectReason}
      onOpenChange={onOpenChange}
      variant={disabling ? "danger" : "default"}
      title={disabling ? "ปิดใช้งานเหตุผลการปฏิเสธนี้หรือไม่?" : "เปิดใช้งานเหตุผลการปฏิเสธนี้หรือไม่?"}
      description={
        disabling
          ? `"${rejectReason.nameTh}" (${rejectReason.code}) จะไม่ปรากฏในรายการเหตุผลการปฏิเสธที่ใช้งานอยู่อีกต่อไป ข้อมูลจะไม่ถูกลบ — คุณสามารถเปิดใช้งานได้อีกครั้งทุกเมื่อ`
          : `"${rejectReason.nameTh}" (${rejectReason.code}) จะกลับมาใช้งานได้อีกครั้งในรายการและตัวเลือกเหตุผลการปฏิเสธที่ใช้งานอยู่`
      }
      confirmLabel={disabling ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      onConfirm={() => onConfirm(rejectReason)}
    />
  );
}
