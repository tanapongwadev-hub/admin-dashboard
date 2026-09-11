"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenericMasterDataFilters } from "@/components/master-data/generic-filters";
import { GenericMasterDataTable } from "@/components/master-data/generic-table";
import { GenericMasterDataFormDialog } from "@/components/master-data/generic-form-dialog";
import { GenericMasterDataStatusDialog } from "@/components/master-data/generic-status-dialog";
import { GenericMasterDataDetailsDialog } from "@/components/master-data/generic-details-dialog";
import { getEntityFromResult } from "@/lib/master-data/utils";
import { masterDataResources } from "@/lib/master-data/resources";
import type { PaginatedResult } from "@/lib/api/create-resource-api";
import type { BaseMasterEntity } from "@/lib/master-data/types";

// Generic client-side orchestrator, shared by every simple-master resource
// — see AGENTS.md § Master-data generic CRUD page. Mirrors the same
// pattern every hand-written `*-client.tsx` file already used: the page
// (server) fetches the initial list and passes it down; this component only
// owns UI state (which dialog is open, for which row). Every mutation goes
// through the resource's own Server Action, then `router.refresh()` re-pulls
// the server list.
//
// Takes `resourceKey` (a plain string), not the resource descriptor itself
// — the descriptor's `actions`/`list`/field-renderer properties are plain
// functions, and React refuses to pass a non-Server-Action function as a
// prop from the Server Component page into this Client Component ("Functions
// cannot be passed directly to Client Components..."). Resolving the real
// descriptor via `masterDataResources[resourceKey]` is an ordinary client-side
// module import, not a value crossing the RSC boundary, so it's unaffected.
// Every dialog/table/filter this component renders below is client-to-client
// and can keep taking the full `resource` object as a prop.
export function GenericMasterDataClient<TEntity extends BaseMasterEntity>({
  resourceKey,
  items,
  meta,
  canEdit,
  canDelete,
}: {
  resourceKey: string;
  items: TEntity[];
  meta: PaginatedResult<TEntity>["meta"];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const resource = masterDataResources[resourceKey];
  const router = useRouter();
  // `undefined` = dialog closed, `null` = "new" mode, `TEntity` = "edit"
  // mode — same 3-state sentinel every resource's own client used.
  const [formTarget, setFormTarget] = React.useState<TEntity | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = React.useState<TEntity | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<TEntity | null>(null);

  function handleSaved() {
    router.refresh();
  }

  async function handleToggleStatus(entity: TEntity) {
    const result = entity.isActive
      ? await resource.actions.deactivate(entity.id)
      : await resource.actions.restore(entity.id);

    if (result.status === "success") {
      const updated = getEntityFromResult<TEntity>(result, resource.resultKey);
      toast.success(entity.isActive ? `ปิดใช้งาน${resource.entityLabel}แล้ว` : `เปิดใช้งาน${resource.entityLabel}แล้ว`, {
        description: `อัปเดต ${updated?.nameTh ?? entity.nameTh} เรียบร้อยแล้ว`,
      });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <GenericMasterDataFilters resource={resource} />
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button onClick={() => setFormTarget(null)} className="shrink-0">
              <Plus className="h-4 w-4" /> เพิ่ม{resource.entityLabel}
            </Button>
          )}
        </div>
      </div>

      <GenericMasterDataTable
        resource={resource}
        items={items}
        meta={meta}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(entity) => setFormTarget(entity)}
        onToggleStatus={(entity) => setStatusTarget(entity)}
        onViewDetails={(entity) => setDetailsTarget(entity)}
      />

      <GenericMasterDataDetailsDialog
        resource={resource}
        entity={detailsTarget}
        canEdit={canEdit}
        onEdit={(entity) => setFormTarget(entity)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      {canEdit && (
        <GenericMasterDataFormDialog
          resource={resource}
          open={formTarget !== undefined}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          entity={formTarget}
          onSaved={handleSaved}
        />
      )}

      {canDelete && (
        <GenericMasterDataStatusDialog
          resource={resource}
          entity={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onConfirm={handleToggleStatus}
        />
      )}
    </div>
  );
}
