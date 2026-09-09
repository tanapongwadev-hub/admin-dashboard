"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnitsFilters } from "@/components/units/units-filters";
import { UnitsTable } from "@/components/units/units-table";
import { UnitsFormDialog } from "@/components/units/units-form-dialog";
import { UnitsStatusDialog } from "@/components/units/units-status-dialog";
import { UnitsDetailsDialog } from "@/components/units/units-details-dialog";
import {
  deactivateUnitAction,
  restoreUnitAction,
} from "@/app/(dashboard)/master-data/units/actions";
import type { Unit, PaginatedUnits } from "@/lib/api/units";

// Client-side orchestrator for `/master-data/units`. Mirrors
// the same pattern as `loading-points-client.tsx`,
// `delivery-types-client.tsx`, `reject-reasons-client.tsx`,
// `material-models-client.tsx`, and `suppliers-client.tsx` — the page
// (server) fetches the initial list and passes it down; the client only
// owns UI state (which dialog is open, for which row). Every mutation goes
// through a Server Action that calls `revalidatePath`, after which the
// client just calls `router.refresh()` to re-pull the server list.

export function UnitsClient({
  units,
  meta,
  canEdit,
  canDelete,
}: {
  units: Unit[];
  meta: PaginatedUnits["meta"];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  // `undefined` = dialog closed, `null` = "new" mode, `Unit` =
  // "edit" mode. Using a 3-state sentinel lets one piece of state drive
  // both "open" and "which row" without a separate `open` boolean.
  const [formTarget, setFormTarget] = React.useState<Unit | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = React.useState<Unit | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<Unit | null>(null);

  function handleSaved() {
    router.refresh();
  }

  async function handleToggleStatus(unit: Unit) {
    const result = unit.isActive
      ? await deactivateUnitAction(unit.id)
      : await restoreUnitAction(unit.id);

    if (result.status === "success") {
      toast.success(unit.isActive ? "ปิดใช้งานหน่วยนับแล้ว" : "เปิดใช้งานหน่วยนับแล้ว", {
        description: `อัปเดต ${result.unit.nameTh} เรียบร้อยแล้ว`,
      });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <UnitsFilters />
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button onClick={() => setFormTarget(null)} className="shrink-0">
              <Plus className="h-4 w-4" /> เพิ่มหน่วยนับ
            </Button>
          )}
        </div>
      </div>

      <UnitsTable
        units={units}
        meta={meta}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(unit) => setFormTarget(unit)}
        onToggleStatus={(unit) => setStatusTarget(unit)}
        onViewDetails={(unit) => setDetailsTarget(unit)}
      />

      <UnitsDetailsDialog
        unit={detailsTarget}
        canEdit={canEdit}
        onEdit={(unit) => setFormTarget(unit)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      {canEdit && (
        <UnitsFormDialog
          open={formTarget !== undefined}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          unit={formTarget}
          onSaved={handleSaved}
        />
      )}

      {canDelete && (
        <UnitsStatusDialog
          unit={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onConfirm={handleToggleStatus}
        />
      )}
    </div>
  );
}
