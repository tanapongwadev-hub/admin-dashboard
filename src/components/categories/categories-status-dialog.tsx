"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Category } from "@/lib/api/categories";

// Wraps the shared `ConfirmDialog` for the soft-delete / restore action on
// a single Category. Mirrors MaterialPcStatusDialog's shape exactly — same
// `variant="default"` for the non-destructive "เปิดใช้งาน" case (re-enabling
// isn't destructive) and `variant="danger"` for "ปิดใช้งาน". See
// `AGENTS.md` § Row actions for the rule on which variant to use.

export function CategoriesStatusDialog({
  category,
  onOpenChange,
  onConfirm,
}: {
  category: Category | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (category: Category) => void;
}) {
  if (!category) return null;
  const disabling = category.isActive;

  return (
    <ConfirmDialog
      open={!!category}
      onOpenChange={onOpenChange}
      variant={disabling ? "danger" : "default"}
      title={disabling ? "ปิดใช้งานหมวดหมู่นี้หรือไม่?" : "เปิดใช้งานหมวดหมู่นี้หรือไม่?"}
      description={
        disabling
          ? `"${category.nameTh}" (${category.code}) จะไม่ปรากฏในรายการหมวดหมู่ที่ใช้งานอยู่อีกต่อไป ข้อมูลจะไม่ถูกลบ — คุณสามารถเปิดใช้งานได้อีกครั้งทุกเมื่อ`
          : `"${category.nameTh}" (${category.code}) จะกลับมาใช้งานได้อีกครั้งในรายการและตัวเลือกหมวดหมู่ที่ใช้งานอยู่`
      }
      confirmLabel={disabling ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      onConfirm={() => onConfirm(category)}
    />
  );
}
