"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialModelsFilters } from "@/components/material-models/material-models-filters";
import { MaterialModelsTable } from "@/components/material-models/material-models-table";
import { MaterialModelsFormDialog } from "@/components/material-models/material-models-form-dialog";
import { MaterialModelsStatusDialog } from "@/components/material-models/material-models-status-dialog";
import { MaterialModelsDetailsDialog } from "@/components/material-models/material-models-details-dialog";
import {
  deactivateMaterialModelAction,
  restoreMaterialModelAction,
} from "@/app/(dashboard)/master-data/material-models/actions";
import type { MaterialModel, PaginatedMaterialModels } from "@/lib/api/material-models";

// Client-side orchestrator for `/master-data/material-models`. Mirrors
// the same pattern as `loading-points-client.tsx`,
// `delivery-types-client.tsx`, and `reject-reasons-client.tsx` — the page
// (server) fetches the initial list and passes it down; the client only
// owns UI state (which dialog is open, for which row). Every mutation goes
// through a Server Action that calls `revalidatePath`, after which the
// client just calls `router.refresh()` to re-pull the server list.

export function MaterialModelsClient({
  materialModels,
  meta,
  canEdit,
  canDelete,
}: {
  materialModels: MaterialModel[];
  meta: PaginatedMaterialModels["meta"];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  // `undefined` = dialog closed, `null` = "new" mode, `MaterialModel` =
  // "edit" mode. Using a 3-state sentinel lets one piece of state drive
  // both "open" and "which row" without a separate `open` boolean (same
  // pattern as material-pc-client.tsx / categories-client.tsx /
  // loading-points-client.tsx / delivery-types-client.tsx /
  // reject-reasons-client.tsx).
  const [formTarget, setFormTarget] = React.useState<MaterialModel | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = React.useState<MaterialModel | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<MaterialModel | null>(null);

  function handleSaved() {
    router.refresh();
  }

  async function handleToggleStatus(materialModel: MaterialModel) {
    const result = materialModel.isActive
      ? await deactivateMaterialModelAction(materialModel.id)
      : await restoreMaterialModelAction(materialModel.id);

    if (result.status === "success") {
      toast.success(materialModel.isActive ? "ปิดใช้งานรุ่นวัสดุแล้ว" : "เปิดใช้งานรุ่นวัสดุแล้ว", {
        description: `อัปเดต ${result.materialModel.nameTh} เรียบร้อยแล้ว`,
      });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MaterialModelsFilters />
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button onClick={() => setFormTarget(null)} className="shrink-0">
              <Plus className="h-4 w-4" /> เพิ่มรุ่นวัสดุ
            </Button>
          )}
        </div>
      </div>

      <MaterialModelsTable
        materialModels={materialModels}
        meta={meta}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(materialModel) => setFormTarget(materialModel)}
        onToggleStatus={(materialModel) => setStatusTarget(materialModel)}
        onViewDetails={(materialModel) => setDetailsTarget(materialModel)}
      />

      <MaterialModelsDetailsDialog
        materialModel={detailsTarget}
        canEdit={canEdit}
        onEdit={(materialModel) => setFormTarget(materialModel)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      {canEdit && (
        <MaterialModelsFormDialog
          open={formTarget !== undefined}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          materialModel={formTarget}
          onSaved={handleSaved}
        />
      )}

      {canDelete && (
        <MaterialModelsStatusDialog
          materialModel={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onConfirm={handleToggleStatus}
        />
      )}
    </div>
  );
}
