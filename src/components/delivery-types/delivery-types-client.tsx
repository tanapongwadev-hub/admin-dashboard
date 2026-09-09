"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliveryTypesFilters } from "@/components/delivery-types/delivery-types-filters";
import { DeliveryTypesTable } from "@/components/delivery-types/delivery-types-table";
import { DeliveryTypesFormDialog } from "@/components/delivery-types/delivery-types-form-dialog";
import { DeliveryTypesStatusDialog } from "@/components/delivery-types/delivery-types-status-dialog";
import { DeliveryTypesDetailsDialog } from "@/components/delivery-types/delivery-types-details-dialog";
import {
  deactivateDeliveryTypeAction,
  restoreDeliveryTypeAction,
} from "@/app/(dashboard)/master-data/delivery-types/actions";
import type { DeliveryType, PaginatedDeliveryTypes } from "@/lib/api/delivery-types";

// Client-side orchestrator for `/master-data/delivery-types`. Mirrors
// the same pattern as `material-pc-client.tsx`, `products-client.tsx`,
// `categories-client.tsx`, and `loading-points-client.tsx` — the page
// (server) fetches the initial list and passes it down; the client only
// owns UI state (which dialog is open, for which row). Every mutation
// goes through a Server Action that calls `revalidatePath`, after which
// the client just calls `router.refresh()` to re-pull the server list.

export function DeliveryTypesClient({
  deliveryTypes,
  meta,
  canEdit,
  canDelete,
}: {
  deliveryTypes: DeliveryType[];
  meta: PaginatedDeliveryTypes["meta"];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  // `undefined` = dialog closed, `null` = "new" mode, `DeliveryType` =
  // "edit" mode. Using a 3-state sentinel lets one piece of state drive
  // both "open" and "which row" without a separate `open` boolean (same
  // pattern as material-pc-client.tsx / categories-client.tsx /
  // loading-points-client.tsx).
  const [formTarget, setFormTarget] = React.useState<DeliveryType | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = React.useState<DeliveryType | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<DeliveryType | null>(null);

  function handleSaved() {
    router.refresh();
  }

  async function handleToggleStatus(deliveryType: DeliveryType) {
    const result = deliveryType.isActive
      ? await deactivateDeliveryTypeAction(deliveryType.id)
      : await restoreDeliveryTypeAction(deliveryType.id);

    if (result.status === "success") {
      toast.success(deliveryType.isActive ? "ปิดใช้งานประเภทการจัดส่งแล้ว" : "เปิดใช้งานประเภทการจัดส่งแล้ว", {
        description: `อัปเดต ${result.deliveryType.nameTh} เรียบร้อยแล้ว`,
      });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DeliveryTypesFilters />
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button onClick={() => setFormTarget(null)} className="shrink-0">
              <Plus className="h-4 w-4" /> เพิ่มประเภทการจัดส่ง
            </Button>
          )}
        </div>
      </div>

      <DeliveryTypesTable
        deliveryTypes={deliveryTypes}
        meta={meta}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(deliveryType) => setFormTarget(deliveryType)}
        onToggleStatus={(deliveryType) => setStatusTarget(deliveryType)}
        onViewDetails={(deliveryType) => setDetailsTarget(deliveryType)}
      />

      <DeliveryTypesDetailsDialog
        deliveryType={detailsTarget}
        canEdit={canEdit}
        onEdit={(deliveryType) => setFormTarget(deliveryType)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      {canEdit && (
        <DeliveryTypesFormDialog
          open={formTarget !== undefined}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          deliveryType={formTarget}
          onSaved={handleSaved}
        />
      )}

      {canDelete && (
        <DeliveryTypesStatusDialog
          deliveryType={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onConfirm={handleToggleStatus}
        />
      )}
    </div>
  );
}
