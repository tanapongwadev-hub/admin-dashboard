"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialPcFilters } from "@/components/materials-pc/material-pc-filters";
import { MaterialPcTable } from "@/components/materials-pc/material-pc-table";
import { MaterialPcFormDialog } from "@/components/materials-pc/material-pc-form-dialog";
import { MaterialPcStatusDialog } from "@/components/materials-pc/material-pc-status-dialog";
import { deactivateMaterialPcAction, restoreMaterialPcAction } from "@/app/(dashboard)/materials/pc/actions";
import type { Material, MaterialLookups, PaginatedResult } from "@/lib/api/materials";

export function MaterialPcClient({
  materials,
  meta,
  lookups,
  canEdit,
  canDelete,
}: {
  materials: Material[];
  meta: PaginatedResult<Material>["meta"];
  lookups: MaterialLookups;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [formTarget, setFormTarget] = React.useState<Material | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = React.useState<Material | null>(null);

  function handleSaved() {
    router.refresh();
  }

  async function handleToggleStatus(material: Material) {
    const result = material.isActive
      ? await deactivateMaterialPcAction(material.id)
      : await restoreMaterialPcAction(material.id);

    if (result.status === "success") {
      toast.success(material.isActive ? "Material disabled" : "Material enabled", {
        description: `${result.material.name} was updated successfully.`,
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
        {canEdit && (
          <Button onClick={() => setFormTarget(null)} className="shrink-0">
            <Plus className="h-4 w-4" /> Add material
          </Button>
        )}
      </div>

      <MaterialPcTable
        materials={materials}
        meta={meta}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(material) => setFormTarget(material)}
        onToggleStatus={(material) => setStatusTarget(material)}
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
