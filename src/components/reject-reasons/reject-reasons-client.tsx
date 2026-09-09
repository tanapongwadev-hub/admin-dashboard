"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RejectReasonsFilters } from "@/components/reject-reasons/reject-reasons-filters";
import { RejectReasonsTable } from "@/components/reject-reasons/reject-reasons-table";
import { RejectReasonsFormDialog } from "@/components/reject-reasons/reject-reasons-form-dialog";
import { RejectReasonsStatusDialog } from "@/components/reject-reasons/reject-reasons-status-dialog";
import { RejectReasonsDetailsDialog } from "@/components/reject-reasons/reject-reasons-details-dialog";
import {
  deactivateRejectReasonAction,
  restoreRejectReasonAction,
} from "@/app/(dashboard)/master-data/reject-reasons/actions";
import type { RejectReason, PaginatedRejectReasons } from "@/lib/api/reject-reasons";

// Client-side orchestrator for `/master-data/reject-reasons`. Mirrors
// the same pattern as `material-pc-client.tsx`, `products-client.tsx`,
// `categories-client.tsx`, `loading-points-client.tsx`, and
// `delivery-types-client.tsx` — the page (server) fetches the initial
// list and passes it down; the client only owns UI state (which dialog
// is open, for which row). Every mutation goes through a Server Action
// that calls `revalidatePath`, after which the client just calls
// `router.refresh()` to re-pull the server list.

export function RejectReasonsClient({
  rejectReasons,
  meta,
  canEdit,
  canDelete,
}: {
  rejectReasons: RejectReason[];
  meta: PaginatedRejectReasons["meta"];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  // `undefined` = dialog closed, `null` = "new" mode, `RejectReason` =
  // "edit" mode. Using a 3-state sentinel lets one piece of state drive
  // both "open" and "which row" without a separate `open` boolean (same
  // pattern as material-pc-client.tsx / categories-client.tsx /
  // loading-points-client.tsx / delivery-types-client.tsx).
  const [formTarget, setFormTarget] = React.useState<RejectReason | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = React.useState<RejectReason | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<RejectReason | null>(null);

  function handleSaved() {
    router.refresh();
  }

  async function handleToggleStatus(rejectReason: RejectReason) {
    const result = rejectReason.isActive
      ? await deactivateRejectReasonAction(rejectReason.id)
      : await restoreRejectReasonAction(rejectReason.id);

    if (result.status === "success") {
      toast.success(rejectReason.isActive ? "ปิดใช้งานเหตุผลการปฏิเสธแล้ว" : "เปิดใช้งานเหตุผลการปฏิเสธแล้ว", {
        description: `อัปเดต ${result.rejectReason.nameTh} เรียบร้อยแล้ว`,
      });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <RejectReasonsFilters />
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button onClick={() => setFormTarget(null)} className="shrink-0">
              <Plus className="h-4 w-4" /> เพิ่มเหตุผลการปฏิเสธ
            </Button>
          )}
        </div>
      </div>

      <RejectReasonsTable
        rejectReasons={rejectReasons}
        meta={meta}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(rejectReason) => setFormTarget(rejectReason)}
        onToggleStatus={(rejectReason) => setStatusTarget(rejectReason)}
        onViewDetails={(rejectReason) => setDetailsTarget(rejectReason)}
      />

      <RejectReasonsDetailsDialog
        rejectReason={detailsTarget}
        canEdit={canEdit}
        onEdit={(rejectReason) => setFormTarget(rejectReason)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      {canEdit && (
        <RejectReasonsFormDialog
          open={formTarget !== undefined}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          rejectReason={formTarget}
          onSaved={handleSaved}
        />
      )}

      {canDelete && (
        <RejectReasonsStatusDialog
          rejectReason={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onConfirm={handleToggleStatus}
        />
      )}
    </div>
  );
}
