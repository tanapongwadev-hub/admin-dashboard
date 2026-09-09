"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuppliersFilters } from "@/components/suppliers/suppliers-filters";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";
import { SuppliersFormDialog } from "@/components/suppliers/suppliers-form-dialog";
import { SuppliersStatusDialog } from "@/components/suppliers/suppliers-status-dialog";
import { SuppliersDetailsDialog } from "@/components/suppliers/suppliers-details-dialog";
import {
  deactivateSupplierAction,
  restoreSupplierAction,
} from "@/app/(dashboard)/master-data/suppliers/actions";
import type { Supplier, PaginatedSuppliers } from "@/lib/api/suppliers";

// Client-side orchestrator for `/master-data/suppliers`. Mirrors
// the same pattern as `loading-points-client.tsx`,
// `delivery-types-client.tsx`, `reject-reasons-client.tsx`, and
// `material-models-client.tsx` — the page (server) fetches the initial
// list and passes it down; the client only owns UI state (which dialog
// is open, for which row). Every mutation goes through a Server Action
// that calls `revalidatePath`, after which the client just calls
// `router.refresh()` to re-pull the server list.

export function SuppliersClient({
  suppliers,
  meta,
  canEdit,
  canDelete,
}: {
  suppliers: Supplier[];
  meta: PaginatedSuppliers["meta"];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [formTarget, setFormTarget] = React.useState<Supplier | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = React.useState<Supplier | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<Supplier | null>(null);

  function handleSaved() {
    router.refresh();
  }

  async function handleToggleStatus(supplier: Supplier) {
    const result = supplier.isActive
      ? await deactivateSupplierAction(supplier.id)
      : await restoreSupplierAction(supplier.id);

    if (result.status === "success") {
      toast.success(supplier.isActive ? "ปิดใช้งานผู้จัดจำหน่ายแล้ว" : "เปิดใช้งานผู้จัดจำหน่ายแล้ว", {
        description: `อัปเดต ${result.supplier.nameTh} เรียบร้อยแล้ว`,
      });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SuppliersFilters />
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button onClick={() => setFormTarget(null)} className="shrink-0">
              <Plus className="h-4 w-4" /> เพิ่มผู้จัดจำหน่าย
            </Button>
          )}
        </div>
      </div>

      <SuppliersTable
        suppliers={suppliers}
        meta={meta}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(supplier) => setFormTarget(supplier)}
        onToggleStatus={(supplier) => setStatusTarget(supplier)}
        onViewDetails={(supplier) => setDetailsTarget(supplier)}
      />

      <SuppliersDetailsDialog
        supplier={detailsTarget}
        canEdit={canEdit}
        onEdit={(supplier) => setFormTarget(supplier)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      {canEdit && (
        <SuppliersFormDialog
          open={formTarget !== undefined}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          supplier={formTarget}
          onSaved={handleSaved}
        />
      )}

      {canDelete && (
        <SuppliersStatusDialog
          supplier={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onConfirm={handleToggleStatus}
        />
      )}
    </div>
  );
}
