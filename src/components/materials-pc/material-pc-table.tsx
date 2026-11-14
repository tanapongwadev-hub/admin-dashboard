"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ImageOff, Eye, PackagePlus, ArrowUpDown, Network, Trash2, CornerDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaterialPcBulkDeleteDialog } from "@/components/materials-pc/material-pc-bulk-delete-dialog";
import { MaterialPcImagePreview } from "@/components/materials-pc/material-pc-image-preview";
import type { ViewMode } from "@/hooks/use-view-mode";
import type { Material, PaginatedResult, StockBalance } from "@/lib/api/materials";
import { cn, formatNumber } from "@/lib/utils";
import { groupMaterials, type MaterialGroup } from "@/lib/material-groups";
import { MaterialStatus, MaterialTypeTag, locationTypeLabel, getStockTone, getStockHealthLabel, supplierNames, shapeLabel, unitLabel, modelLabel, loadingPointLabel, processLineLabel, MaterialThumbnail, getMaterialRowActions, MaterialActions, type MaterialCollectionProps, type MaterialRowProps } from "./material-pc-parts";
export {
  getStockTone, getStockHealthLabel, supplierNames, shapeLabel, unitLabel, modelLabel, deliveryLabel, materialTypeLabel, loadingPointLabel, processLineLabel, specificationLabel, descriptionLabel, getMaterialRowActions,
} from "./material-pc-parts";
export type { StockTone } from "./material-pc-parts";

function MaterialGroupHeading({ group }: { group: MaterialGroup }) {
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
    <Network className="size-4 shrink-0 text-primary" aria-hidden="true" />
    <span className="break-all text-sm font-semibold text-fg">{group.main.code}</span>
    <span className="text-xs text-fg-secondary">{group.members.length > 1 ? `Material main + sub · ${group.members.length} รายการ` : "Material"}</span>
  </div>;
}

// The page no longer scopes to a single `type` (see AGENTS.md § Materials
// PC), so every view needs a quick visual cue for which of PC/OF/OF_MAT a
// row is — the type filter narrows the list, this badge tells them apart
// once several types are shown together.
// =====================================================================
// EDITORIAL CARD with DATA SHEET (view === "card")
// Image-led, magazine-style: 4:3 hero image, 32px stock number as
// "data hero", 2-column data table (label | value) for all 6 essential
// fields. See AGENTS.md § Materials PC for the design history
// (Editorial → Stat Grid → Data Sheet, 2026-09-05).
// =====================================================================

// Hero image for the Editorial card. 4:3 aspect with a small inset so the
// rounded photo frame sits inside the card's outer radius. Kept
// `object-contain` (not `cover`) since a material photo is a technical
// reference — cropped edges/details would be misleading.
function MaterialEditorialPhoto({ material, onPreview }: { material: Material; onPreview: (material: Material) => void }) {
  const imagePath = material.imagePath?.trim() || null;
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const canShowImage = imagePath !== null && failedPath !== imagePath;

  if (!canShowImage) {
    return (
      <span
        className="flex h-full w-full items-center justify-center rounded-[10px] bg-surface-2 text-fg-muted"
        role="img"
        aria-label={`ไม่มีรูปภาพสำหรับ ${material.name}`}
      >
        <ImageOff className="size-7" aria-hidden="true" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(material)}
      aria-label={`ดูรูปภาพเต็มของ ${material.name}`}
      className="relative block h-full w-full cursor-zoom-in overflow-hidden rounded-[10px] bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Image
        src={imagePath}
        alt={`Material image: ${material.name}`}
        fill
        sizes="(min-width: 640px) 50vw, 100vw"
        className="object-contain p-3"
        onError={() => setFailedPath(imagePath)}
      />
    </button>
  );
}

// Data Sheet cell — one key-value pair in the card's 2-column table. Real
// `<table>` markup (not a CSS grid) so screen readers announce the row
// relationship and column count correctly. No truncation on the value —
// the card has enough width at 2-col grid (~248px content area) to fit
// every label + the common value lengths; values longer than one line
// wrap with `break-words` instead of ellipsizing, so a full supplier
// name list ("CPS Steel, ABC Corp, XYZ Industries") reads in full.
function MaterialEditorialCard({
  material,
  stockByMaterialId,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
  onReceive,
  isReceivable,
  onViewReceivingHistory,
  onViewDisbursementHistory,
  onViewBomUsage,
  onDeletePermanent,
  onPreview,
}: MaterialRowProps) {
  const balance = stockByMaterialId?.[material.id];
  const quantity = balance ? Number(balance.quantity) : 0;
  const unit = material.unit?.nameEn ?? material.unit?.code ?? "";
  const tone = getStockTone(quantity, Number(material.minimumStock));
  const health = getStockHealthLabel(tone);

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface shadow-sm transition-colors hover:border-border-strong"
      role="group"
      aria-label={`บัตรแสดงวัสดุ ${material.name}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
        <div className="absolute inset-2.5">
          <MaterialEditorialPhoto material={material} onPreview={onPreview} />
        </div>
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          <MaterialTypeTag material={material} />
          <MaterialStatus material={material} />
          <RowActionsMenu
            itemLabel={material.name}
            actions={getMaterialRowActions(material, canEdit, canDelete, {
              onEdit,
              onToggleStatus,
              isReceivable,
              onViewReceivingHistory,
              onViewDisbursementHistory,
              onViewBomUsage,
              onDeletePermanent,
            })}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-1 pt-4">
        <p className="mb-1.5 font-mono text-[13px] leading-none tracking-[0.05em] text-primary">{material.code}</p>
        <h2 className="mb-1 truncate text-lg font-semibold leading-tight text-fg" title={material.name}>
          {material.name}
        </h2>
        <p className="truncate text-sm leading-tight text-fg-secondary">
          {material.materialType}
          {material.ratio ? ` · ${material.ratio}` : ""}
        </p>
        <p className="mt-1 text-xs text-fg-secondary">Location Type: {locationTypeLabel(material)}</p>

      </div>

      {stockByMaterialId && (
        <div className="flex items-end justify-between gap-3 px-4 pb-3">
          <div className="min-w-0">
            <span
              className={cn(
                "text-xs font-semibold uppercase leading-none tracking-[0.08em]",
                tone === "warning" ? "text-warning" : tone === "muted" ? "text-fg-secondary" : "text-primary"
              )}
            >
              คงเหลือ
            </span>
            <div className="mt-1.5">
              <span
                className={cn(
                "text-2xl font-bold leading-none tracking-tight tabular-nums",
                  tone === "warning" ? "text-warning" : tone === "muted" ? "text-fg-secondary" : "text-fg"
                )}
              >
                {formatNumber(quantity)}
              </span>
              {unit && <span className="ml-1.5 text-sm font-medium text-fg-secondary">{unit}</span>}
            </div>
          </div>
          <Badge variant={health.variant} style={{ fontSize: "10.5px" }}>
            {health.label}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-3 border-t border-border bg-surface-2/40 text-xs">
        <CardMeta label="ขั้นต่ำ" value={`${formatNumber(Number(material.minimumStock))} ${unitLabel(material)}`} />
        <CardMeta label="จุดขึ้นสินค้า" value={loadingPointLabel(material)} />
        <CardMeta label="สายการผลิต" value={processLineLabel(material)} />
      </div>

      {/* Up to three buttons — the on/off action moved to the Switch above,
          so this row only carries "look"/"jump elsewhere" (neutral outline:
          ดูรายละเอียด, รับเข้า) vs. "act" (solid primary: แก้ไข) — a color
          hierarchy that's readable without memorizing what red/green/blue
          meant here before. min-w-0 on every Button + a truncating label
          span keeps a long label from overflowing the card on narrow widths
          (flex-1 alone doesn't allow a flex item to shrink below its
          content's natural width). */}
      <div className="flex gap-2 border-t border-border px-4 py-3">
        {/* BOM owners are received only from closing production: no receive action at all. */}
        {isReceivable?.(material) !== false && (
          <Button
            variant="primary"
            size="sm"
            className="min-w-0 flex-1 px-2"
            onClick={() => onReceive(material)}
          >
            <PackagePlus className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">+ รับเข้า</span>
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="min-w-0 flex-1 px-2"
          onClick={() => onViewDetails(material)}
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">รายละเอียด</span>
        </Button>
      </div>
    </article>
  );
}

function CardMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-border px-3 py-2.5 last:border-r-0">
      <p className="mb-1 text-xs text-fg-muted">{label}</p>
      <p className="truncate font-medium text-fg-secondary" title={value}>{value}</p>
    </div>
  );
}

// =====================================================================
// COMPACT LIST ROW (view === "list")
// Horizontal dense row — 56px photo, identity, stock + actions. For
// scanning 50+ materials at once. See AGENTS.md § Materials PC.
// =====================================================================

function MaterialListPhoto({ material, onPreview }: { material: Material; onPreview: (material: Material) => void }) {
  const imagePath = material.imagePath?.trim() || null;
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const canShowImage = imagePath !== null && failedPath !== imagePath;

  if (!canShowImage) {
    return (
      <span
        className="flex h-full w-full items-center justify-center bg-surface-2 text-fg-muted"
        role="img"
        aria-label={`ไม่มีรูปภาพสำหรับ ${material.name}`}
      >
        <ImageOff className="size-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(material)}
      aria-label={`ดูรูปภาพเต็มของ ${material.name}`}
      className="relative block h-full w-full cursor-zoom-in overflow-hidden bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
    >
      <Image
        src={imagePath}
        alt={`Material image: ${material.name}`}
        fill
        sizes="56px"
        className="object-cover"
        onError={() => setFailedPath(imagePath)}
      />
    </button>
  );
}

function MaterialListItem({
  material,
  stockByMaterialId,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
  onReceive,
  isReceivable,
  onViewReceivingHistory,
  onViewDisbursementHistory,
  onViewBomUsage,
  onDeletePermanent,
  onPreview,
}: MaterialRowProps) {
  const balance = stockByMaterialId?.[material.id];
  const quantity = balance ? Number(balance.quantity) : 0;
  const unit = material.unit?.nameEn ?? material.unit?.code ?? "";
  const tone = getStockTone(quantity, Number(material.minimumStock));
  const health = getStockHealthLabel(tone);

  return (
    <article
      className={cn(
        "group grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-lg border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong sm:grid-cols-[56px_1fr_auto] sm:gap-4 sm:px-4 sm:py-3",
        material.isActive ? "border-border" : "border-border opacity-70",
        tone === "warning" && "border-warning/40"
      )}
      role="group"
      aria-label={`รายการวัสดุ ${material.name}`}
    >
      <div className="h-11 w-11 overflow-hidden rounded-md border border-border sm:h-14 sm:w-14 sm:rounded-lg">
        <MaterialListPhoto material={material} onPreview={onPreview} />
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] leading-none text-fg-muted">{material.code}</span>
          <MaterialTypeTag material={material} />
          <MaterialStatus material={material} />
          {stockByMaterialId && quantity >= 0 && (
            <Badge variant={health.variant} style={{ fontSize: "10.5px", padding: "1px 6px" }}>
              {health.label}
            </Badge>
          )}
        </div>
        <h2 className="mb-1 truncate text-lg font-semibold leading-tight text-fg" title={material.name}>
          {material.name}
        </h2>
        <p className="mb-1 text-xs text-fg-secondary">Location Type: {locationTypeLabel(material)}</p>
        <div className="flex items-center gap-2 truncate text-xs leading-tight text-fg-secondary sm:gap-2.5">
          <span className="truncate">{shapeLabel(material)}</span>
          <span aria-hidden="true" className="text-border-strong">·</span>
          <span className="truncate">{modelLabel(material)}</span>
          <span aria-hidden="true" className="hidden text-border-strong sm:inline">·</span>
          <span className="hidden truncate sm:inline" title={supplierNames(material)}>
            {supplierNames(material)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {stockByMaterialId && (
          <div className="min-w-[68px] text-right">
            <p className="mb-0.5 text-xs uppercase leading-none tracking-[0.08em] text-fg-muted">คงเหลือ</p>
            <p
              className={cn(
                "text-lg font-bold leading-none tracking-[-0.01em] tabular-nums sm:text-xl",
                tone === "muted" ? "text-fg-muted" : tone === "warning" ? "text-warning" : "text-fg"
              )}
            >
              {formatNumber(quantity)}
              {unit && <span className="ml-1 text-xs font-medium text-fg-muted sm:text-xs">{unit}</span>}
            </p>
          </div>
        )}
        <RowActionsMenu
          itemLabel={material.name}
          actions={getMaterialRowActions(material, canEdit, canDelete, {
            onEdit,
            onToggleStatus,
            onViewDetails,
            onReceive,
            isReceivable,
            onViewReceivingHistory,
            onViewDisbursementHistory,
            onViewBomUsage,
            onDeletePermanent,
          })}
        />
      </div>
    </article>
  );
}

// =====================================================================
// TABLE VIEW with row selection (view === "table")
// Checkbox column + a "N รายการถูกเลือก" bar that appears once anything is
// checked, with its own clear-selection action — a real, working piece of
// feedback for the checkbox column rather than a decorative dead control.
// No bulk actions exist in cps-api for materials (batch disable/restore
// isn't a real endpoint), so this intentionally stops at "select + clear",
// not a fabricated bulk-action toolbar.
// =====================================================================
function MaterialPcSelectableTable({
  materials,
  groupRelated = true,
  collectionHeader,
  stockByMaterialId,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
  onReceive,
  isReceivable,
  onViewReceivingHistory,
  onViewDisbursementHistory,
  onViewBomUsage,
  onDeletePermanent,
  onPreview,
}: Omit<MaterialCollectionProps, "view"> & { onPreview: (material: Material) => void }) {
  const groups = groupRelated ? groupMaterials(materials) : materials.map((main) => ({ id: main.id, main, members: [main] }));
  const groupByMemberId = new Map(groups.flatMap((group) => group.members.map((member) => [member.id, group] as const)));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const router = useRouter();
  const allSelected = materials.length > 0 && selected.size === materials.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(materials.map((m) => m.id)) : new Set());
  }
  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary-soft px-3 py-2 text-sm text-primary">
          <span>เลือกแล้ว {selected.size} รายการ</span>
          <div className="flex items-center gap-1">
            {canDelete && onDeletePermanent && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setBulkDeleteOpen(true)} className="h-7 gap-1 px-2 text-danger hover:text-danger">
                <Trash2 className="size-3.5" aria-hidden="true" />ลบที่เลือก
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="h-7 px-2 text-primary hover:text-primary">
              ล้างการเลือก
            </Button>
          </div>
        </div>
      )}
      {bulkDeleteOpen && (
        <MaterialPcBulkDeleteDialog
          materials={materials.filter((m) => selected.has(m.id))}
          onClose={() => setBulkDeleteOpen(false)}
          onDone={() => { setBulkDeleteOpen(false); setSelected(new Set()); router.refresh(); }}
        />
      )}
      {collectionHeader}
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm [&>div:last-child]:max-h-[68vh] [&>div:last-child]:overflow-auto [&>div:last-child]:[scrollbar-width:none] [&>div:last-child::-webkit-scrollbar]:hidden">
        <Table className="min-w-[1080px]">
          <TableHeader className="sticky top-0 z-20 bg-surface-2 shadow-[0_1px_0_0_var(--border)] [&_th]:h-12">
            <TableRow>
              <TableHead className="w-11 min-w-11 bg-surface-2 sm:sticky sm:left-0 sm:z-30">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                  aria-label="เลือกวัสดุทั้งหมดในหน้านี้"
                />
              </TableHead>
              <TableHead className="min-w-72 bg-surface-2 sm:sticky sm:left-11 sm:z-30">
                <div className="flex items-center gap-3"><SortableButton label="รหัสวัสดุ" field="code" /><span className="text-border-strong" aria-hidden="true">/</span><SortableButton label="ชื่อวัสดุ" field="name" /></div>
              </TableHead>
              <TableHead>ประเภท / ชนิด</TableHead>
              <TableHead>Location Type</TableHead>
              {stockByMaterialId && <SortableHead label="คงเหลือ" field="currentStock" />}
              <TableHead>ซัพพลายเออร์</TableHead>
              <TableHead>ข้อมูลปฏิบัติงาน</TableHead>
              <TableHead>การใช้งาน</TableHead>
              {stockByMaterialId && <SortableHead label="รับเข้าล่าสุด" field="lastReceivedAt" />}
              <TableHead className="whitespace-nowrap" title="วันที่รับเข้าหรือแก้ไขข้อมูลวัสดุล่าสุด (แล้วแต่อย่างใดใหม่กว่า)">ทำรายการล่าสุด</TableHead>
              <TableHead className="text-right">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.flatMap((group) => group.members).map((material) => {
              const group = groupByMemberId.get(material.id)!;
              const balance = stockByMaterialId?.[material.id];
              const quantity = balance ? Number(balance.quantity) : 0;
              const stockHealth = getStockHealthLabel(getStockTone(quantity, Number(material.minimumStock)));
              const isSelected = selected.has(material.id);
              const isMain = group.members.length > 1 && material.id === group.main.id;
              const isSub = group.members.length > 1 && material.id !== group.main.id;
              const rowSurface = isSelected ? "bg-primary-soft" : isMain ? "bg-primary-soft/40 group-hover:bg-primary-soft" : "bg-surface group-hover:bg-surface-2";
              return (
                <TableRow key={material.id} data-state={isSelected ? "selected" : undefined} className={cn("group hover:bg-surface-2/70", isMain && "bg-primary-soft/40 hover:bg-primary-soft")}>
                  <TableCell className={cn("w-11 min-w-11 sm:sticky sm:left-0 sm:z-10", rowSurface)}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => toggleOne(material.id, checked === true)}
                      aria-label={`เลือกวัสดุ ${material.name}`}
                    />
                  </TableCell>
                  <TableCell className={cn("min-w-72 max-w-96 sm:sticky sm:left-11 sm:z-10", rowSurface)}>
                    <div className={cn("flex items-center gap-3", isSub && "pl-6")}>
                      {isSub && <CornerDownRight className="size-4 shrink-0 text-primary/60" aria-hidden="true" />}
                      <MaterialThumbnail material={material} onPreview={onPreview} />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => onViewDetails(material)} className="break-all text-left font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`ดูรายละเอียดวัสดุ ${material.code}`}>{material.code}</button>{group.members.length > 1 && <Badge variant={material.id === group.main.id ? "primary" : "info"} className="text-xs">{material.id === group.main.id ? "Main" : "Sub"}</Badge>}</div>
                        <p className="max-w-64 truncate text-sm font-medium text-fg" title={material.name}>{material.name}</p>
                        <p className="max-w-64 truncate text-xs text-fg-muted" title={modelLabel(material)}>รุ่น: {modelLabel(material)}</p>
                        {isSub && <span className="sr-only">Material sub ของ {group.main.code}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><div className="space-y-1.5"><MaterialTypeTag material={material} /><p className="text-xs text-fg-secondary">{shapeLabel(material)}</p></div></TableCell>
                  <TableCell className="whitespace-nowrap"><Badge variant={material.locationType === "internal" ? "primary" : "neutral"}>{locationTypeLabel(material)}</Badge></TableCell>
                  {stockByMaterialId && (
                    <TableCell className="min-w-36">
                      <p className="text-right text-lg font-semibold tabular-nums text-fg">{formatNumber(quantity)} <span className="text-xs font-normal text-fg-muted">{unitLabel(material) !== "—" ? unitLabel(material) : ""}</span></p>
                      <p className="mt-0.5 text-right text-xs text-fg-muted">ขั้นต่ำ {formatNumber(Number(material.minimumStock))}</p>
                      <div className="mt-1.5 flex justify-end"><Badge variant={stockHealth.variant} dot>{stockHealth.label}</Badge></div>
                    </TableCell>
                  )}
                  <TableCell className="max-w-44"><p className="line-clamp-2 text-xs leading-relaxed text-fg-secondary" title={supplierNames(material)}>{supplierNames(material)}</p></TableCell>
                  <TableCell className="min-w-40 text-xs"><p className="text-fg-secondary"><span className="text-fg-muted">จุดขึ้น: </span>{loadingPointLabel(material)}</p><p className="mt-1.5 text-fg-secondary"><span className="text-fg-muted">สายผลิต: </span>{processLineLabel(material)}</p></TableCell>
                  <TableCell>
                    <MaterialStatus material={material} />
                  </TableCell>
                  {stockByMaterialId && <TableCell className="whitespace-nowrap text-fg-muted">{formatDate(balance?.lastReceivedAt)}</TableCell>}
                  <TableCell className="whitespace-nowrap text-fg-muted">{formatDate(latestActivity(material.updatedAt, balance?.lastReceivedAt))}</TableCell>
                  <TableCell className="text-right">
                    <MaterialActions
                      material={material}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={onEdit}
                      onToggleStatus={onToggleStatus}
                      onViewDetails={onViewDetails}
                      onReceive={onReceive}
                      isReceivable={isReceivable}
                      onViewReceivingHistory={onViewReceivingHistory}
                      onViewDisbursementHistory={onViewDisbursementHistory}
                      onViewBomUsage={onViewBomUsage}
                      onDeletePermanent={onDeletePermanent}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// =====================================================================
// COLLECTION — switches between table / card / list. See AGENTS.md
// § Materials PC for the design rationale (Editorial + Compact combo).
// =====================================================================
export function MaterialPcCollection({
  materials,
  groupRelated = true,
  collectionHeader,
  view,
  canEdit,
  canDelete,
  stockByMaterialId,
  onEdit,
  onToggleStatus,
  onViewDetails,
  onReceive,
  isReceivable,
  onViewReceivingHistory,
  onViewDisbursementHistory,
  onViewBomUsage,
  onDeletePermanent,
}: MaterialCollectionProps) {
  const [previewTarget, setPreviewTarget] = useState<Material | null>(null);
  const groups = groupRelated ? groupMaterials(materials) : materials.map((main) => ({ id: main.id, main, members: [main] }));

  const commonProps = {
    canEdit,
    canDelete,
    stockByMaterialId,
    onEdit,
    onToggleStatus,
    onViewDetails,
    onReceive,
    isReceivable,
    onViewReceivingHistory,
    onViewDisbursementHistory,
    onViewBomUsage,
    onDeletePermanent,
    onPreview: setPreviewTarget,
  };

  return (
    <div className="@container">
      {view === "table" ? (
        // Keyed by this page's own material ids so navigating to a
        // different page/filter/sort remounts the table fresh — the
        // simplest way to reset row selection without a synchronous
        // setState-in-effect (blocked by this project's lint config, see
        // AGENTS.md's "derive, don't effect" rule).
        <MaterialPcSelectableTable
          key={materials.map((m) => m.id).join("|")}
          materials={materials}
          groupRelated={groupRelated}
          collectionHeader={collectionHeader}
          stockByMaterialId={stockByMaterialId}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onViewDetails={onViewDetails}
          onReceive={onReceive}
          isReceivable={isReceivable}
          onViewReceivingHistory={onViewReceivingHistory}
          onViewDisbursementHistory={onViewDisbursementHistory}
          onViewBomUsage={onViewBomUsage}
          onDeletePermanent={onDeletePermanent}
          onPreview={setPreviewTarget}
        />
      ) : (
        <div aria-label={view === "list" ? "รายการวัสดุแบบแถว" : "รายการวัสดุแบบการ์ด"} className={view === "list" ? "space-y-3" : "grid grid-cols-1 items-start gap-3 @min-[36rem]:grid-cols-2 @min-[60rem]:grid-cols-3 @min-[82rem]:grid-cols-4 @min-[100rem]:grid-cols-5"}>
          {groups.map((group) => group.members.length === 1 ? (
            <div key={group.id} className="min-w-0 h-full">
              {view === "list" ? <MaterialListItem material={group.main} {...commonProps} /> : <MaterialEditorialCard material={group.main} {...commonProps} />}
            </div>
          ) : <section key={group.id} aria-label={`กลุ่มวัสดุ ${group.main.code}`} className={cn("min-w-0 overflow-hidden rounded-lg border border-border bg-surface-2/40", view === "card" && "@min-[36rem]:col-span-2")}>
            <div className="border-b border-border bg-primary-soft/40"><MaterialGroupHeading group={group} /></div>
            <ul className={view === "list" ? "space-y-3 p-3" : "grid grid-cols-1 gap-3 p-3 @min-[36rem]:grid-cols-2"}>
              {group.members.map((material) => <li key={material.id} className="flex min-w-0 flex-col gap-2">
                {group.members.length > 1 && <div className="flex items-center gap-2 px-1"><Badge variant={material.id === group.main.id ? "primary" : "info"}>{material.id === group.main.id ? "Material main" : "Material sub"}</Badge><span className="text-xs text-fg-muted">{material.id === group.main.id ? "วัตถุดิบต้นทาง" : "วัสดุหลังแปรรูป"}</span></div>}
                {view === "list" ? <MaterialListItem material={material} {...commonProps} /> : <MaterialEditorialCard material={material} {...commonProps} />}
              </li>)}
            </ul>
          </section>)}
        </div>
      )}

      <MaterialPcImagePreview material={previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)} />
    </div>
  );
}

type MaterialSortField = "code" | "name" | "currentStock" | "lastReceivedAt";

function SortableHead({ label, field }: { label: string; field: MaterialSortField }) {
  return <TableHead><SortableButton label={label} field={field} /></TableHead>;
}

function SortableButton({ label, field }: { label: string; field: MaterialSortField }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = (searchParams.get("sortBy") ?? "createdAt") === field;
  const direction = (searchParams.get("sortBy") ?? "createdAt") === "createdAt" && !searchParams.get("sortOrder") ? "desc" : searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  return (
      <button
        type="button"
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm font-medium hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sortBy", field);
          params.set("sortOrder", active && direction === "asc" ? "desc" : "asc");
          params.delete("page");
          router.push(`${pathname}?${params.toString()}`);
        }}
      >
        {label}<ArrowUpDown className={cn("size-3.5", active ? "text-primary" : "text-fg-muted")} />
      </button>
  );
}

function latestActivity(...values: (string | null | undefined)[]): string | null {
  const times = values.filter((v): v is string => !!v).map((v) => new Date(v).getTime()).filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function MaterialPcTable({
  materials,
  groupRelated = true,
  collectionHeader,
  meta,
  view,
  canEdit,
  canDelete,
  stockByMaterialId,
  onEdit,
  onToggleStatus,
  onViewDetails,
  onReceive,
  isReceivable,
  onViewReceivingHistory,
  onViewDisbursementHistory,
  onViewBomUsage,
  onDeletePermanent,
}: {
  materials: Material[];
  groupRelated?: boolean;
  collectionHeader?: ReactNode;
  meta: PaginatedResult<Material>["meta"];
  view: ViewMode;
  canEdit: boolean;
  canDelete: boolean;
  stockByMaterialId: Record<string, StockBalance> | null;
  onEdit: (material: Material) => void;
  onToggleStatus: (material: Material) => void;
  onViewDetails: (material: Material) => void;
  onReceive: (material: Material) => void;
  // false for Materials that may only be received from closing production (they own a BOM).
  isReceivable?: (material: Material) => boolean;
  onViewReceivingHistory: (material: Material) => void;
  onViewDisbursementHistory: (material: Material) => void;
  onViewBomUsage: (material: Material) => void;
  onDeletePermanent?: (material: Material) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  function changePageSize(limit: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", limit);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  if (materials.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {collectionHeader}
        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-fg">ไม่พบวัสดุ</p>
          <p className="text-sm text-fg-muted">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {view !== "table" && collectionHeader}
      <MaterialPcCollection
        materials={materials}
        groupRelated={groupRelated}
        collectionHeader={collectionHeader}
        view={view}
        canEdit={canEdit}
        canDelete={canDelete}
        stockByMaterialId={stockByMaterialId}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        onViewDetails={onViewDetails}
        onReceive={onReceive}
        isReceivable={isReceivable}
        onViewReceivingHistory={onViewReceivingHistory}
        onViewDisbursementHistory={onViewDisbursementHistory}
        onViewBomUsage={onViewBomUsage}
        onDeletePermanent={onDeletePermanent}
      />

      <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          หน้า {meta.page} จาก {Math.max(1, meta.totalPages)} · ทั้งหมด {meta.totalItems} {groupRelated ? "กลุ่ม" : "รายการ"}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
            <span className="whitespace-nowrap text-xs">{groupRelated ? "กลุ่ม" : "รายการ"}ต่อหน้า</span>
            <Select value={String(meta.limit)} onValueChange={changePageSize}>
              <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[20, 40, 60].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-label="หน้าก่อนหน้า"
            disabled={meta.page <= 1}
            onClick={() => goToPage(meta.page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">ก่อนหน้า</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="หน้าถัดไป"
            disabled={meta.page >= meta.totalPages}
            onClick={() => goToPage(meta.page + 1)}
          >
            <span className="hidden sm:inline">ถัดไป</span> <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
