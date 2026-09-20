"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
import { MaterialsDisbursementFilters } from "@/components/materials-disbursement/materials-disbursement-filters";
import { MaterialsDisbursementTable } from "@/components/materials-disbursement/materials-disbursement-table";
import { MaterialsDisbursementFormDialog } from "@/components/materials-disbursement/materials-disbursement-form-dialog";
import { MaterialsDisbursementCancelDialog } from "@/components/materials-disbursement/materials-disbursement-cancel-dialog";
import {
  confirmMaterialsDisbursementAction,
  cancelMaterialsDisbursementAction,
  deleteMaterialsDisbursementAction,
} from "@/app/(dashboard)/materials/materials-disbursement/actions";
import type { MaterialsDisbursement, MaterialsDisbursementLookups, PaginatedResult } from "@/lib/api/materials-disbursement";

// Full CRUD orchestrator as of 2026-09-20 (previously List + Filter only,
// see AGENTS.md § Material Disbursement) — mirrors MaterialsReceivingClient's
// shape: filters/pagination stay URL-driven, dialog open/edit-target state
// lives here, mutations are Server Actions followed by router.refresh().
export function MaterialsDisbursementClient({
  disbursements,
  meta,
  lookups,
  canCreate,
  canUpdate,
  canConfirm,
  canCancel,
  canDelete,
}: {
  disbursements: MaterialsDisbursement[];
  meta: PaginatedResult<MaterialsDisbursement>["meta"];
  lookups: MaterialsDisbursementLookups;
  canCreate: boolean;
  canUpdate: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // undefined = closed, null = create mode, a disbursement = edit mode —
  // same "undefined vs null vs value" shape as Products' wizardTarget.
  const [formTarget, setFormTarget] = React.useState<MaterialsDisbursement | null | undefined>(undefined);
  // Bumped on every "เพิ่มรายการจ่ายออก"/edit click so the form dialog fully
  // remounts with fresh useState initializers (see AGENTS.md § Material
  // Receiving's "derive, don't effect" rule — this component uses plain
  // useState, not react-hook-form, so it isn't skipped by the React
  // Compiler's analysis and a reset-on-open effect would be rejected by lint).
  const [formSessionId, setFormSessionId] = React.useState(0);
  const [cancelTarget, setCancelTarget] = React.useState<MaterialsDisbursement | null>(null);
  // Same 3-way table/card/list toggle as Materials PC and Materials
  // Receiving (see AGENTS.md § Materials PC) — default stays "table" here
  // since a disbursement's item list (multiple materials per row) reads
  // most naturally as a dense table first; card/list are equally real
  // alternate presentations, not a lesser-supported view.
  const [view, setView] = useViewMode("materials-disbursement", "table");

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSaved() {
    router.refresh();
  }

  async function handleConfirm(disbursement: MaterialsDisbursement) {
    const result = await confirmMaterialsDisbursementAction(disbursement.id);
    if (result.status === "success") {
      toast.success("ยืนยันการจ่ายออกสำเร็จ", { description: result.disbursement.disbursementNo });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  async function handleCancel(disbursement: MaterialsDisbursement, cancelReason: string) {
    const result = await cancelMaterialsDisbursementAction(disbursement.id, cancelReason);
    if (result.status === "success") {
      toast.success("ยกเลิกรายการจ่ายออกแล้ว", { description: result.disbursement.disbursementNo });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  async function handleDelete(disbursement: MaterialsDisbursement) {
    const result = await deleteMaterialsDisbursementAction(disbursement.id);
    if (result.status === "success") {
      toast.success("ลบร่างแล้ว", { description: disbursement.disbursementNo });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ViewToggle value={view} onChange={setView} modes={["table", "card", "list"]} />
        {canCreate && (
          <Button
            onClick={() => {
              setFormSessionId((id) => id + 1);
              setFormTarget(null);
            }}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" /> เพิ่มรายการจ่ายออก
          </Button>
        )}
      </div>

      <MaterialsDisbursementFilters lookups={lookups} totalItems={meta.totalItems} />

      <MaterialsDisbursementTable
        disbursements={disbursements}
        view={view}
        canUpdate={canUpdate}
        canConfirm={canConfirm}
        canCancel={canCancel}
        canDelete={canDelete}
        onEdit={(disbursement) => {
          setFormSessionId((id) => id + 1);
          setFormTarget(disbursement);
        }}
        onConfirm={handleConfirm}
        onCancel={(disbursement) => setCancelTarget(disbursement)}
        onDelete={handleDelete}
      />

      {disbursements.length > 0 && (
        <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            หน้า {meta.page} จาก {Math.max(1, meta.totalPages)} · ทั้งหมด {meta.totalItems} รายการ
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => goToPage(meta.page - 1)}
              aria-label="หน้าก่อนหน้า"
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">ก่อนหน้า</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => goToPage(meta.page + 1)}
              aria-label="หน้าถัดไป"
            >
              <span className="hidden sm:inline">ถัดไป</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {(canCreate || canUpdate) && (
        <MaterialsDisbursementFormDialog
          key={formSessionId}
          open={formTarget !== undefined}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          lookups={lookups}
          disbursement={formTarget}
          onSaved={handleSaved}
        />
      )}

      {canCancel && (
        <MaterialsDisbursementCancelDialog
          key={cancelTarget?.id ?? "none"}
          disbursement={cancelTarget}
          onOpenChange={(open) => !open && setCancelTarget(null)}
          onConfirm={handleCancel}
        />
      )}
    </div>
  );
}
