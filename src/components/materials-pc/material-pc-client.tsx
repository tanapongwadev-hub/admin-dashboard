"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useViewMode } from "@/hooks/use-view-mode";
import { MaterialPcFilters } from "@/components/materials-pc/material-pc-filters";
import { MaterialPcTable } from "@/components/materials-pc/material-pc-table";
import { MaterialPcFormDialog } from "@/components/materials-pc/material-pc-form-dialog";
import { MaterialPcDraftsDialog } from "@/components/materials-pc/material-pc-drafts-dialog";
import { MaterialPcStatusDialog } from "@/components/materials-pc/material-pc-status-dialog";
import { MaterialPcDeleteDialog } from "@/components/materials-pc/material-pc-delete-dialog";
import { MaterialPcDetailsDialog } from "@/components/materials-pc/material-pc-details-dialog";
import { MaterialBomUsageDialog } from "@/components/materials-pc/material-bom-usage-dialog";
import { deactivateMaterialPcAction, restoreMaterialPcAction } from "@/app/(dashboard)/materials/catalog/actions";
import type { Material, MaterialDraftRecord, MaterialLookups, PaginatedResult, StockBalance } from "@/lib/api/materials";

export function MaterialPcClient({
  materials,
  meta,
  lookups,
  canEdit,
  canDelete,
  stockByMaterialId,
  canViewStock,
  activeTab,
  tabCounts,
  canViewBom,
  bomMaterialIds,
  initialEditMaterial = null,
}: {
  materials: Material[];
  meta: PaginatedResult<Material>["meta"];
  lookups: MaterialLookups;
  canEdit: boolean;
  canDelete: boolean;
  // null when the current user lacks MATERIALS_RECEIVING_VIEW — the stock
  // section is omitted entirely in that case, not shown as zero/broken.
  stockByMaterialId: Record<string, StockBalance> | null;
  canViewStock: boolean;
  activeTab: "all" | "raw" | "bom";
  tabCounts: { all: number; raw: number; bom: number };
  canViewBom: boolean;
  // Materials owning a Material BOM: stock only comes from closing production,
  // so the manual "รับเข้า" action is hidden for them (cps-api enforces it too).
  bomMaterialIds: string[];
  /** Material whose edit dialog opens on arrival (from ?edit=<id>). */
  initialEditMaterial?: Material | null;
}) {
  const bomIdSet = React.useMemo(() => new Set(bomMaterialIds), [bomMaterialIds]);
  const isReceivable = React.useCallback((material: Material) => !bomIdSet.has(material.id), [bomIdSet]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  function changeTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "all") params.delete("tab");
    else params.set("tab", tab);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }
  // Default to "card" (Editorial) so first-time visitors see the new image-led
  // design. Users can still switch to "table" or "list" via the ViewToggle,
  // and the choice is persisted in localStorage per the page key. See
  // AGENTS.md § Materials PC for why Editorial is the default.
  const [view, setView] = useViewMode("materials-pc", "card");
  const [formTarget, setFormTarget] = React.useState<Material | null | undefined>(initialEditMaterial ?? undefined);
  React.useEffect(() => {
    if (!searchParams.get("edit")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);
  const [draftTarget, setDraftTarget] = React.useState<MaterialDraftRecord | null>(null);
  const [draftsOpen, setDraftsOpen] = React.useState(false);
  const [statusTarget, setStatusTarget] = React.useState<Material | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Material | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<Material | null>(null);
  const [bomUsageTarget, setBomUsageTarget] = React.useState<Material | null>(null);

  function handleSaved(created?: Material) {
    if (created) {
      // Jump to the freshly created material (newest first anyway).
      const raw = ["PIPE", "SHEET", "COIL"].includes(created.materialType ?? "");
      const params = new URLSearchParams({ search: created.code });
      if (raw) params.set("tab", "raw");
      router.push(`${pathname}?${params.toString()}`);
      return;
    }
    router.refresh();
  }

  // Jumps to Material Receiving with this material pre-selected AND the
  // create dialog auto-opened (?open=create) — "go create a new receiving
  // for this material", referenced by code (not a raw id) so the URL stays
  // legible. See materials-receiving-client.tsx, which resolves the code
  // back to the material's id via its own lookups and pre-fills the create
  // dialog. `open=create` is what distinguishes this from
  // handleViewReceivingHistory below — without it, ?materialCode= alone
  // only filters the list (a persistent, bookmarkable filter), it doesn't
  // pop the create dialog.
  function handleReceive(material: Material) {
    router.push(
      `/materials/receiving?materialCode=${encodeURIComponent(material.code)}&open=create`
    );
  }

  // "View history" — navigates with material.code as a persistent list
  // filter only (no ?open=create), so refreshing/bookmarking/sharing the
  // URL keeps showing this material's receiving/disbursement documents.
  function handleViewReceivingHistory(material: Material) {
    router.push(`/materials/receiving?materialCode=${encodeURIComponent(material.code)}`);
  }

  function handleViewDisbursementHistory(material: Material) {
    router.push(`/materials/disbursements?materialCode=${encodeURIComponent(material.code)}`);
  }

  async function handleToggleStatus(material: Material) {
    const result = material.isActive
      ? await deactivateMaterialPcAction(material.id)
      : await restoreMaterialPcAction(material.id);

    if (result.status === "success") {
      toast.success(material.isActive ? "ปิดใช้งานวัสดุแล้ว" : "เปิดใช้งานวัสดุแล้ว", {
        description: `อัปเดต ${result.material.name} เรียบร้อยแล้ว`,
      });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  const collectionHeader = (
    <div className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsList aria-label="ประเภทรายการวัสดุ" className="h-auto min-w-max gap-1 p-1">
          <TabsTrigger value="all" className="gap-2">รายการปกติ <span className="text-xs tabular-nums">{tabCounts.all.toLocaleString("th-TH")}</span></TabsTrigger>
          <TabsTrigger value="raw" className="gap-2">Pipe / Sheet / Coil <span className="text-xs tabular-nums">{tabCounts.raw.toLocaleString("th-TH")}</span></TabsTrigger>
          <TabsTrigger value="bom" disabled={!canViewBom} title={!canViewBom ? "ต้องมีสิทธิ์ดู Material BOM" : undefined} className="gap-2">รายการวัสดุ ภายใน {canViewBom && <span className="text-xs tabular-nums">{tabCounts.bom.toLocaleString("th-TH")}</span>}</TabsTrigger>
        </TabsList>
      {!canViewBom && <p className="mt-2 text-xs text-fg-muted">แท็บรายการวัสดุ ภายใน ต้องมีสิทธิ์ดู Material BOM</p>}
    </div>
  );

  return (
    <Tabs value={activeTab} onValueChange={changeTab} activationMode="manual" className="flex flex-col gap-4">
      <TabsContent value={activeTab} className="mt-0 flex flex-col gap-4">
      {activeTab === "bom" && !canViewBom ? <>{collectionHeader}<p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">คุณไม่มีสิทธิ์ดู Material BOM กรุณาติดต่อผู้ดูแลระบบ</p></> : <>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ViewToggle value={view} onChange={setView} modes={["table", "card", "list"]} />
        {canEdit && <Button variant="outline" onClick={() => setDraftsOpen(true)}><FileText className="size-4" aria-hidden="true" />ร่างของฉัน</Button>}
        {canEdit && (
          <Button onClick={() => { setDraftTarget(null); setFormTarget(null); }} className="shrink-0">
            <Plus className="h-4 w-4" /> เพิ่มวัสดุ
          </Button>
        )}
      </div>

      <MaterialPcFilters lookups={lookups} canViewStock={canViewStock} totalItems={meta.totalItems} countUnit="รายการ" />

      <MaterialPcTable
        materials={materials}
        collectionHeader={collectionHeader}
        groupRelated={false}
        meta={meta}
        view={view}
        canEdit={canEdit}
        canDelete={canDelete}
        stockByMaterialId={stockByMaterialId}
        onEdit={(material) => setFormTarget(material)}
        onToggleStatus={(material) => setStatusTarget(material)}
        onViewDetails={(material) => setDetailsTarget(material)}
        onReceive={handleReceive}
        isReceivable={isReceivable}
        onViewReceivingHistory={handleViewReceivingHistory}
        onViewDisbursementHistory={handleViewDisbursementHistory}
        onViewBomUsage={(material) => setBomUsageTarget(material)}
        onDeletePermanent={canDelete ? setDeleteTarget : undefined}
      />
      </>}
      </TabsContent>

      <MaterialPcDetailsDialog
        material={detailsTarget}
        stockByMaterialId={stockByMaterialId}
        units={lookups.units}
        models={lookups.models}
        loadingPoints={lookups.loadingPoints}
        canEdit={canEdit}
        onEdit={(material) => setFormTarget(material)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      <MaterialBomUsageDialog
        material={bomUsageTarget}
        onOpenChange={(open) => !open && setBomUsageTarget(null)}
      />

      {canEdit && formTarget !== undefined && (
        <MaterialPcFormDialog
          key={draftTarget ? `draft-${draftTarget.id}` : formTarget?.id ?? "create"}
          open={formTarget !== undefined}
          onOpenChange={(open) => { if (!open) { setFormTarget(undefined); setDraftTarget(null); } }}
          material={formTarget}
          draft={draftTarget}
          lookups={lookups}
          onSaved={handleSaved}
        />
      )}
      {canEdit && draftsOpen && <MaterialPcDraftsDialog onClose={() => setDraftsOpen(false)} onResume={(draft, material) => { setDraftsOpen(false); setDraftTarget(draft); setFormTarget(material); }} />}

      {canDelete && (
        <MaterialPcStatusDialog
          material={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onConfirm={handleToggleStatus}
        />
      )}
      {canDelete && deleteTarget && <MaterialPcDeleteDialog key={deleteTarget.id} material={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); router.refresh(); }} onDeactivate={() => { setStatusTarget(deleteTarget); setDeleteTarget(null); }} />}
    </Tabs>
  );
}
