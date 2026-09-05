"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
import { MaterialPcFilters } from "@/components/materials-pc/material-pc-filters";
import { MaterialPcTable } from "@/components/materials-pc/material-pc-table";
import { MaterialPcFormDialog } from "@/components/materials-pc/material-pc-form-dialog";
import { MaterialPcStatusDialog } from "@/components/materials-pc/material-pc-status-dialog";
import { MaterialPcDetailsDialog } from "@/components/materials-pc/material-pc-details-dialog";
import { deactivateMaterialPcAction, restoreMaterialPcAction } from "@/app/(dashboard)/materials/pc/actions";
import type { Material, MaterialLookups, PaginatedResult, StockBalance } from "@/lib/api/materials";

export function MaterialPcClient({
  materials,
  meta,
  lookups,
  canEdit,
  canDelete,
  stockByMaterialId,
}: {
  materials: Material[];
  meta: PaginatedResult<Material>["meta"];
  lookups: MaterialLookups;
  canEdit: boolean;
  canDelete: boolean;
  // null when the current user lacks MATERIALS_RECEIVING_VIEW — the stock
  // section is omitted entirely in that case, not shown as zero/broken.
  stockByMaterialId: Record<string, StockBalance> | null;
}) {
  const router = useRouter();
  // Default to "card" (Editorial) so first-time visitors see the new image-led
  // design. Users can still switch to "table" or "list" via the ViewToggle,
  // and the choice is persisted in localStorage per the page key. See
  // AGENTS.md § Materials PC for why Editorial is the default.
  const [view, setView] = useViewMode("materials-pc", "card");
  const [formTarget, setFormTarget] = React.useState<Material | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = React.useState<Material | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<Material | null>(null);

  function handleSaved() {
    router.refresh();
  }

  async function handleToggleStatus(material: Material) {
    const result = material.isActive
      ? await deactivateMaterialPcAction(material.id)
      : await restoreMaterialPcAction(material.id);

    if (result.status === "success") {
      toast.success(material.isActive ? "ปิดใช้งานวัสดุแล้ว" : "เปิดใช้งานวัสดุแล้ว", {
        description: `อัปเดต ${result.material.name} เรียบร้อยแล้ว`,
      });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MaterialPcFilters />
        <div className="flex shrink-0 items-center gap-2">
          <ViewToggle value={view} onChange={setView} modes={["table", "card", "list"]} />
          {canEdit && (
            <Button onClick={() => setFormTarget(null)} className="shrink-0">
              <Plus className="h-4 w-4" /> เพิ่มวัสดุ
            </Button>
          )}
        </div>
      </div>

      <MaterialPcTable
        materials={materials}
        meta={meta}
        view={view}
        canEdit={canEdit}
        canDelete={canDelete}
        stockByMaterialId={stockByMaterialId}
        onEdit={(material) => setFormTarget(material)}
        onToggleStatus={(material) => setStatusTarget(material)}
        onViewDetails={(material) => setDetailsTarget(material)}
      />

      <MaterialPcDetailsDialog
        material={detailsTarget}
        stockByMaterialId={stockByMaterialId}
        canEdit={canEdit}
        onEdit={(material) => setFormTarget(material)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      {canEdit && (
        <MaterialPcFormDialog
          open={formTarget !== undefined}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          material={formTarget}
          lookups={lookups}
          onSaved={handleSaved}
        />
      )}

      {canDelete && (
        <MaterialPcStatusDialog
          material={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onConfirm={handleToggleStatus}
        />
      )}
    </div>
  );
}
