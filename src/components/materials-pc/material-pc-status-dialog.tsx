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
      title={disabling ? "Disable this material?" : "Enable this material?"}
      description={
        disabling
          ? `"${material.name}" (${material.code}) will stop appearing in active material lists. It isn't deleted — you can enable it again anytime.`
          : `"${material.name}" (${material.code}) will become available again in active material lists and lookups.`
      }
      confirmLabel={disabling ? "Disable" : "Enable"}
      onConfirm={() => onConfirm(material)}
    />
  );
}
