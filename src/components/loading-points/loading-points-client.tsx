"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingPointsFilters } from "@/components/loading-points/loading-points-filters";
import { LoadingPointsTable } from "@/components/loading-points/loading-points-table";
import { LoadingPointsFormDialog } from "@/components/loading-points/loading-points-form-dialog";
import { LoadingPointsStatusDialog } from "@/components/loading-points/loading-points-status-dialog";
import { LoadingPointsDetailsDialog } from "@/components/loading-points/loading-points-details-dialog";
import {
  deactivateLoadingPointAction,
  restoreLoadingPointAction,
} from "@/app/(dashboard)/master-data/loading-points/actions";
import type { LoadingPoint, PaginatedLoadingPoints } from "@/lib/api/loading-points";

// Client-side orchestrator for `/master-data/loading-points`. Mirrors
// the same pattern as `material-pc-client.tsx`, `products-client.tsx`,
// and `categories-client.tsx` — the page (server) fetches the initial
// list and passes it down; the client only owns UI state (which dialog
// is open, for which row). Every mutation goes through a Server Action
// that calls `revalidatePath`, after which the client just calls
// `router.refresh()` to re-pull the server list.

export function LoadingPointsClient({
  loadingPoints,
  meta,
  canEdit,
  canDelete,
}: {
  loadingPoints: LoadingPoint[];
  meta: PaginatedLoadingPoints["meta"];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  // `undefined` = dialog closed, `null` = "new" mode, `LoadingPoint` =
  // "edit" mode. Using a 3-state sentinel lets one piece of state drive
  // both "open" and "which row" without a separate `open` boolean (same
  // pattern as material-pc-client.tsx / categories-client.tsx).
  const [formTarget, setFormTarget] = React.useState<LoadingPoint | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = React.useState<LoadingPoint | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<LoadingPoint | null>(null);

  function handleSaved() {
    router.refresh();
  }

  async function handleToggleStatus(loadingPoint: LoadingPoint) {
    const result = loadingPoint.isActive
      ? await deactivateLoadingPointAction(loadingPoint.id)
      : await restoreLoadingPointAction(loadingPoint.id);

    if (result.status === "success") {
      toast.success(loadingPoint.isActive ? "ปิดใช้งานจุดขนถ่ายแล้ว" : "เปิดใช้งานจุดขนถ่ายแล้ว", {
        description: `อัปเดต ${result.loadingPoint.nameTh} เรียบร้อยแล้ว`,
      });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <LoadingPointsFilters />
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button onClick={() => setFormTarget(null)} className="shrink-0">
              <Plus className="h-4 w-4" /> เพิ่มจุดขนถ่าย
            </Button>
          )}
        </div>
      </div>

      <LoadingPointsTable
        loadingPoints={loadingPoints}
        meta={meta}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(loadingPoint) => setFormTarget(loadingPoint)}
        onToggleStatus={(loadingPoint) => setStatusTarget(loadingPoint)}
        onViewDetails={(loadingPoint) => setDetailsTarget(loadingPoint)}
      />

      <LoadingPointsDetailsDialog
        loadingPoint={detailsTarget}
        canEdit={canEdit}
        onEdit={(loadingPoint) => setFormTarget(loadingPoint)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      {canEdit && (
        <LoadingPointsFormDialog
          open={formTarget !== undefined}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          loadingPoint={formTarget}
          onSaved={handleSaved}
        />
      )}

      {canDelete && (
        <LoadingPointsStatusDialog
          loadingPoint={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onConfirm={handleToggleStatus}
        />
      )}
    </div>
  );
}
