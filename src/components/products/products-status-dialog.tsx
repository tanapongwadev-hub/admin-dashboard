"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Product } from "@/lib/api/products";

export function ProductsStatusDialog({
  product,
  onOpenChange,
  onConfirm,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (product: Product) => void;
}) {
  if (!product) return null;
  const disabling = product.isActive;

  return (
    <ConfirmDialog
      open={!!product}
      onOpenChange={onOpenChange}
      variant={disabling ? "danger" : "default"}
      title={disabling ? "ปิดใช้งานสินค้านี้หรือไม่?" : "เปิดใช้งานสินค้านี้หรือไม่?"}
      description={
        disabling
          ? `"${product.name}" (${product.code}) จะไม่ปรากฏในรายการสินค้าที่ใช้งานอยู่อีกต่อไป ข้อมูลจะไม่ถูกลบ — คุณสามารถเปิดใช้งานได้อีกครั้งทุกเมื่อ`
          : `"${product.name}" (${product.code}) จะกลับมาใช้งานได้อีกครั้งในรายการและตัวเลือกสินค้าที่ใช้งานอยู่`
      }
      confirmLabel={disabling ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      onConfirm={() => onConfirm(product)}
    />
  );
}
