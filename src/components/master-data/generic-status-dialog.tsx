"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { MasterDataResourceConfig, BaseMasterEntity } from "@/lib/master-data/types";

// Generic soft-delete / restore confirmation, shared by every simple-master
// resource — every one of the 7 hand-written `*-status-dialog.tsx` files
// turned out to be byte-identical modulo the entity's Thai noun (confirmed
// while building this generic layer, see AGENTS.md § Master-data generic
// CRUD page). `variant="default"` for the non-destructive "เปิดใช้งาน" case
// (re-enabling isn't destructive), `variant="danger"` for "ปิดใช้งาน".

export function GenericMasterDataStatusDialog<TEntity extends BaseMasterEntity>({
  resource,
  entity,
  onOpenChange,
  onConfirm,
}: {
  resource: MasterDataResourceConfig<TEntity>;
  entity: TEntity | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (entity: TEntity) => void;
}) {
  if (!entity) return null;
  const disabling = entity.isActive;
  const label = resource.entityLabel;

  return (
    <ConfirmDialog
      open={!!entity}
      onOpenChange={onOpenChange}
      variant={disabling ? "danger" : "default"}
      title={disabling ? `ปิดใช้งาน${label}นี้หรือไม่?` : `เปิดใช้งาน${label}นี้หรือไม่?`}
      description={
        disabling
          ? `"${entity.nameTh}" (${entity.code}) จะไม่ปรากฏในรายการ${label}ที่ใช้งานอยู่อีกต่อไป ข้อมูลจะไม่ถูกลบ — คุณสามารถเปิดใช้งานได้อีกครั้งทุกเมื่อ`
          : `"${entity.nameTh}" (${entity.code}) จะกลับมาใช้งานได้อีกครั้งในรายการและตัวเลือก${label}ที่ใช้งานอยู่`
      }
      confirmLabel={disabling ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      onConfirm={() => onConfirm(entity)}
    />
  );
}
