"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
import { MaterialsReceivingFilters } from "@/components/materials-receiving/materials-receiving-filters";
import { MaterialsReceivingTable } from "@/components/materials-receiving/materials-receiving-table";
import { MaterialsReceivingFormDialog } from "@/components/materials-receiving/materials-receiving-form-dialog";
import { MaterialsReceivingDetailsDialog } from "@/components/materials-receiving/materials-receiving-details-dialog";
import { MaterialsReceivingCancelDialog } from "@/components/materials-receiving/materials-receiving-cancel-dialog";
import {
  confirmMaterialsReceivingAction,
  cancelMaterialsReceivingAction,
  deleteMaterialsReceivingAction,
} from "@/app/(dashboard)/materials/materials-receiving/actions";
import type { MaterialReceiving, MaterialReceivingLookups } from "@/lib/api/materials-receiving";

export function MaterialsReceivingClient({
  receivings,
  totalItems,
  page,
  totalPages,
  lookups,
  canCreate,
  canConfirm,
  canCancel,
  canDelete,
  initialMaterialCode,
}: {
  receivings: MaterialReceiving[];
  totalItems: number;
  page: number;
  totalPages: number;
  lookups: MaterialReceivingLookups;
  canCreate: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  canDelete: boolean;
  // Set by /materials/pc's "รับเข้า" row action (a URL query param resolved
  // to a real material by page.tsx) — pre-selects and auto-opens the create
  // dialog for that material on first load. See materials-pc-client.tsx.
  initialMaterialCode?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const initialMaterial = initialMaterialCode
    ? lookups.materials.find((m) => m.code.toLowerCase() === initialMaterialCode.toLowerCase())
    : undefined;
  // Defaults to "card" (not "table") — every field on the card is explicitly
  // labeled in Thai, which reads faster for a first-time/warehouse-floor
  // user than a dense table mixing English column headers ("Internal Lot",
  // "Supplier Lot") with Thai ones. Same reasoning as Materials PC's own
  // card default (see AGENTS.md § Materials PC).
  const [view, setView] = useViewMode("materials-receiving", "card");
  // Auto-open (and pre-select the material, via pendingInitialMaterialId)
  // when arriving with a real ?materialCode= match — these initializers only
  // run once, at mount, so a later manual "+" click below always starts
  // clean regardless of what the URL had on first load.
  const [formOpen, setFormOpen] = React.useState(() => !!initialMaterial);
  const [pendingInitialMaterialId, setPendingInitialMaterialId] = React.useState<string | undefined>(
    () => initialMaterial?.id
  );
  // Bumped every time the form dialog opens so it fully remounts with fresh
  // state (see AGENTS.md § Material Receiving) instead of using a
  // reset-on-open effect, which this project's lint config rejects for a
  // component the React Compiler doesn't skip analyzing.
  const [formSessionId, setFormSessionId] = React.useState(0);
  const [detailsTarget, setDetailsTarget] = React.useState<MaterialReceiving | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<MaterialReceiving | null>(null);

  // Once the initial material has served its purpose (dialog opened), drop
  // ?materialCode= from the URL so a later refresh/revalidate doesn't carry
  // stale intent — router.refresh()/revalidatePath elsewhere only re-fetch
  // server data on this same component instance, they don't remount it or
  // re-run this state's initializer.
  React.useEffect(() => {
    if (initialMaterialCode) {
      router.replace(pathname);
    }
  }, [initialMaterialCode, pathname, router]);

  function handleSaved() {
    router.refresh();
  }

  async function handleConfirm(receiving: MaterialReceiving) {
    const result = await confirmMaterialsReceivingAction(receiving.id);
    if (result.status === "success") {
      toast.success("ยืนยันการรับเข้าสำเร็จ", { description: result.receiving.internalLotNo });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  async function handleCancel(receiving: MaterialReceiving, cancelReason: string) {
    const result = await cancelMaterialsReceivingAction(receiving.id, cancelReason);
    if (result.status === "success") {
      toast.success("ยกเลิกรายการรับเข้าแล้ว", { description: result.receiving.internalLotNo });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  async function handleDelete(receiving: MaterialReceiving) {
    const result = await deleteMaterialsReceivingAction(receiving.id);
    if (result.status === "success") {
      toast.success("ลบร่างแล้ว", { description: receiving.internalLotNo });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MaterialsReceivingFilters />
        <div className="flex shrink-0 items-center gap-2">
          <ViewToggle value={view} onChange={setView} modes={["table", "card", "list"]} />
          {canCreate && (
            <Button
              onClick={() => {
                setPendingInitialMaterialId(undefined);
                setFormSessionId((id) => id + 1);
                setFormOpen(true);
              }}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" /> รับเข้าวัตถุดิบ
            </Button>
          )}
        </div>
      </div>

      <MaterialsReceivingTable
        receivings={receivings}
        totalItems={totalItems}
        page={page}
        totalPages={totalPages}
        view={view}
        canConfirm={canConfirm}
        canCancel={canCancel}
        canDelete={canDelete}
        onViewDetails={(receiving) => setDetailsTarget(receiving)}
        onConfirm={handleConfirm}
        onCancel={(receiving) => setCancelTarget(receiving)}
        onDelete={handleDelete}
      />

      <MaterialsReceivingDetailsDialog
        receiving={detailsTarget}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      {canCancel && (
        <MaterialsReceivingCancelDialog
          key={cancelTarget?.id ?? "none"}
          receiving={cancelTarget}
          onOpenChange={(open) => !open && setCancelTarget(null)}
          onConfirm={handleCancel}
        />
      )}

      {canCreate && (
        <MaterialsReceivingFormDialog
          key={formSessionId}
          open={formOpen}
          onOpenChange={setFormOpen}
          lookups={lookups}
          onSaved={handleSaved}
          initialMaterialId={pendingInitialMaterialId}
        />
      )}
    </div>
  );
}
