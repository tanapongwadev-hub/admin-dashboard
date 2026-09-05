"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Pencil,
  Ban,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import { MaterialPcImagePreview } from "@/components/materials-pc/material-pc-image-preview";
import type { ViewMode } from "@/hooks/use-view-mode";
import type { Material, PaginatedResult, StockBalance } from "@/lib/api/materials";
import { cn, formatNumber } from "@/lib/utils";

interface MaterialCollectionProps {
  materials: Material[];
  view: ViewMode;
  canEdit: boolean;
  canDelete: boolean;
  // null when the current user lacks MATERIALS_RECEIVING_VIEW — the card's
  // stock section is omitted entirely in that case (see AGENTS.md § Materials PC).
  stockByMaterialId: Record<string, StockBalance> | null;
  onEdit: (material: Material) => void;
  onToggleStatus: (material: Material) => void;
  // Opens the shared MaterialPcDetailsDialog (see material-pc-details-dialog.tsx)
  // with every field on the material — every view shows only the essentials
  // inline and defers the full record to this dialog on demand.
  onViewDetails: (material: Material) => void;
}

// Props for a single-row renderer (Editorial card or List item) — same
// fields as MaterialCollectionProps minus the list-level "materials"/"view",
// plus a per-row "material" and the parent's "onPreview" so the photo
// buttons can open the lightbox shared across view modes.
type MaterialRowProps = Omit<MaterialCollectionProps, "materials" | "view"> & {
  material: Material;
  onPreview: (material: Material) => void;
};

function MaterialStatus({ material }: { material: Material }) {
  return (
    <Badge variant={material.isActive ? "success" : "neutral"} dot>
      {material.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
    </Badge>
  );
}

// Derived once per row — used by Editorial + List views to color the stock
// hero. Backend has no min/max threshold field, so this is a simple heuristic:
// 0 → muted, 1-9 → warning, 10+ → primary. If cps-api ever ships a stock
// threshold, replace this with the real value (don't keep both).
// Exported so the details dialog can color its stock card identically.
export type StockTone = "muted" | "warning" | "primary";
export function getStockTone(quantity: number): StockTone {
  if (quantity <= 0) return "muted";
  if (quantity < 10) return "warning";
  return "primary";
}

export function getStockHealthLabel(tone: StockTone): { label: string; variant: "success" | "warning" | "neutral" } {
  if (tone === "muted") return { label: "หมดสต็อก", variant: "neutral" };
  if (tone === "warning") return { label: "ใกล้หมด", variant: "warning" };
  return { label: "สต็อกเพียงพอ", variant: "success" };
}

// Every supplier's name, not just a count — "2 ราย"/"2 ซัพฯ" told you how
// many but not which ones, so anyone checking sourcing had to open the edit
// dialog just to see the list. Joined for the compact card/list meta cells
// (which still truncate to one line with `title` for the full text on
// hover/focus); the table column has room to wrap, so it's rendered there
// unmodified.
export function supplierNames(material: Material): string {
  return material.suppliers.length > 0
    ? material.suppliers.map((s) => s.nameEn ?? s.nameTh ?? s.code).join(", ")
    : "—";
}

// Every field on `Material` gets a display label somewhere — the essentials
// (shape, unit, model, delivery, suppliers) inline in each view, the rest
// (loading point, process line, scale, packing, specification, description)
// only in MaterialPcDetailsDialog's full-record view (see
// material-pc-details-dialog.tsx). Exported/kept as pure functions so the
// dialog and the three inline renderers can't drift on how a field is
// formatted.
export function shapeLabel(material: Material): string {
  return material.ratio ? `${material.materialType} · ${material.ratio}` : material.materialType;
}
export function unitLabel(material: Material): string {
  return material.unit?.nameEn ?? material.unit?.code ?? "—";
}
export function modelLabel(material: Material): string {
  return material.model?.nameEn ?? material.model?.code ?? "—";
}
export function deliveryLabel(material: Material): string {
  return material.deliveryType?.nameEn ?? material.deliveryType?.code ?? "—";
}
export function loadingPointLabel(material: Material): string {
  return material.loadingPoint?.nameEn ?? material.loadingPoint?.code ?? "—";
}
export function processLineLabel(material: Material): string {
  return material.processLineName ?? "—";
}
export function specificationLabel(material: Material): string {
  return material.specification ?? "—";
}
export function descriptionLabel(material: Material): string {
  return material.description ?? "—";
}

// =====================================================================
// Shared thumbnail (used by table view). Editorial and List have their
// own sized variants below — see MaterialEditorialPhoto / MaterialListPhoto.
// =====================================================================
function MaterialThumbnail({ material, onPreview }: { material: Material; onPreview: (material: Material) => void }) {
  const imagePath = material.imagePath?.trim() || null;
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const canShowImage = imagePath !== null && failedPath !== imagePath;

  if (!canShowImage) {
    return (
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted"
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
      className="relative block size-10 shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-border bg-surface-2"
    >
      <Image
        src={imagePath}
        alt={`Material image: ${material.name}`}
        fill
        sizes="40px"
        className="object-cover"
        onError={() => setFailedPath(imagePath)}
      />
    </button>
  );
}

// Pure — exported for tests. Mirrors the backend's own MATERIAL_UPDATE (edit)
// vs MATERIAL_DELETE (disable/restore) permission split; enabling a disabled
// row is intentionally "default", not "danger" — it isn't destructive.
export function getMaterialRowActions(
  material: Material,
  canEdit: boolean,
  canDelete: boolean,
  handlers: {
    onEdit: (material: Material) => void;
    onToggleStatus: (material: Material) => void;
    // Optional so existing call sites/tests that only exercise
    // edit/disable behavior don't have to pass a no-op — omitting it just
    // means "ดูรายละเอียด" isn't in the resulting action list.
    onViewDetails?: (material: Material) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [];
  if (handlers.onViewDetails) {
    actions.push({
      label: "ดูรายละเอียด",
      icon: Eye,
      onSelect: () => handlers.onViewDetails!(material),
      variant: "default",
    });
  }
  if (canEdit) {
    actions.push({
      label: "แก้ไข",
      icon: Pencil,
      onSelect: () => handlers.onEdit(material),
      variant: "default",
    });
  }
  if (canDelete) {
    actions.push(
      material.isActive
        ? { label: "ปิดใช้งาน", icon: Ban, onSelect: () => handlers.onToggleStatus(material), variant: "danger" }
        : { label: "เปิดใช้งาน", icon: RotateCcw, onSelect: () => handlers.onToggleStatus(material), variant: "default" }
    );
  }
  return actions;
}

function MaterialActions({
  material,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: Omit<MaterialCollectionProps, "materials" | "view" | "stockByMaterialId"> & { material: Material }) {
  return (
    <RowActionsMenu
      itemLabel={material.name}
      actions={getMaterialRowActions(material, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails })}
    />
  );
}

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
function DataSheetRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <th scope="row" className="w-[42%] py-2.5 pl-[18px] pr-3 text-left align-top text-[12.5px] font-normal text-fg-muted">
        {label}
      </th>
      <td className="py-2.5 pr-[18px] text-left align-top text-[13px] font-medium text-fg break-words">
        {value}
      </td>
    </tr>
  );
}

function MaterialEditorialCard({
  material,
  stockByMaterialId,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
  onPreview,
}: MaterialRowProps) {
  const balance = stockByMaterialId?.[material.id];
  const quantity = balance ? Number(balance.quantity) : 0;
  const unit = material.unit?.nameEn ?? material.unit?.code ?? "";
  const tone = getStockTone(quantity);
  const health = getStockHealthLabel(tone);

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-shadow duration-200 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)]"
      role="group"
      aria-label={`บัตรแสดงวัสดุ ${material.name}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <div className="absolute inset-3">
          <MaterialEditorialPhoto material={material} onPreview={onPreview} />
        </div>
        <div className="absolute right-3.5 top-3.5 z-10">
          <MaterialStatus material={material} />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-[18px] pb-1 pt-[18px]">
        <p className="mb-2 font-mono text-[11px] leading-none tracking-[0.05em] text-fg-secondary">{material.code}</p>
        <h2 className="mb-1 truncate text-[17px] font-semibold leading-tight tracking-[-0.01em] text-fg" title={material.name}>
          {material.name}
        </h2>
        <p className="truncate text-[12.5px] leading-tight text-fg-secondary">
          {material.materialType}
          {material.ratio ? ` · ${material.ratio}` : ""}
        </p>

        {/* Status is a single toggle switch, not a red/green text button —
            the on/off shape reads unambiguously without relying on a color
            convention. Shown only when the viewer can actually flip it;
            otherwise the read-only badge on the photo is the only status
            indicator. Still confirmed via the existing status dialog
            (onToggleStatus), never flips immediately on click. */}
        {canDelete && (
          <label className="mt-2.5 flex w-fit cursor-pointer items-center gap-2">
            <Switch
              checked={material.isActive}
              onCheckedChange={() => onToggleStatus(material)}
              aria-label={material.isActive ? `ปิดใช้งาน ${material.name}` : `เปิดใช้งาน ${material.name}`}
            />
            <span className="text-xs font-medium text-fg-secondary">
              {material.isActive ? "ใช้งานอยู่" : "ไม่ได้ใช้งาน"}
            </span>
          </label>
        )}
      </div>

      {stockByMaterialId && (
        <div className="flex items-baseline justify-between gap-3 px-[18px] pb-3.5">
          <div className="min-w-0">
            <span
              className={cn(
                "text-[10px] font-semibold uppercase leading-none tracking-[0.08em]",
                tone === "warning" ? "text-warning" : tone === "muted" ? "text-fg-secondary" : "text-primary"
              )}
            >
              คงเหลือ
            </span>
            <div className="mt-1.5">
              <span
                className={cn(
                  "text-[32px] font-bold leading-none tracking-[-0.025em] tabular-nums",
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

      {/* Data Sheet: 2-column table (label | value) for all 6 essential
          fields (replaces the earlier Stat Grid bento, 2026-09-05 — see
          AGENTS.md § Materials PC). Real <table> markup so screen readers
          get the row relationship; no truncation — the card has enough
          width at 2-col grid for full label + value to fit on one line for
          most fields, and `break-words` lets long values wrap to a second
          line (e.g. the full supplier name list) rather than ellipsizing.
          The same `loadingPointLabel`/`processLineLabel`/`supplierNames`
          helpers used by the table view and the details dialog guarantee
          the formatting stays in sync. */}
      <div className="border-t border-border">
        <table className="w-full text-sm">
          <tbody>
            <DataSheetRow label="ซัพพลายเออร์" value={supplierNames(material)} />
            <DataSheetRow label="รุ่น" value={modelLabel(material)} />
            <DataSheetRow label="หน่วย" value={unitLabel(material)} />
            <DataSheetRow label="ประเภทการจัดส่ง" value={deliveryLabel(material)} />
            <DataSheetRow label="จุดขึ้นสินค้า" value={loadingPointLabel(material)} />
            <DataSheetRow label="สายการผลิต" value={processLineLabel(material)} />
          </tbody>
        </table>
      </div>

      {/* Two buttons now, not three — the on/off action moved to the Switch
          above, so this row only carries "look" (neutral outline) vs. "act"
          (solid primary) — a color hierarchy that's readable without
          memorizing what red/green/blue meant here before. min-w-0 on both
          Buttons + a truncating label span keeps a long label from
          overflowing the card on narrow widths (flex-1 alone doesn't allow
          a flex item to shrink below its content's natural width). */}
      <div className="flex gap-2 border-t border-border px-[18px] py-3">
        <Button
          variant="outline"
          size="sm"
          className="min-w-0 flex-1 px-2"
          onClick={() => onViewDetails(material)}
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">ดูรายละเอียด</span>
        </Button>
        {canEdit && (
          <Button
            variant="primary"
            size="sm"
            className="min-w-0 flex-1 px-2"
            onClick={() => onEdit(material)}
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">แก้ไข</span>
          </Button>
        )}
      </div>
    </article>
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
  onPreview,
}: MaterialRowProps) {
  const balance = stockByMaterialId?.[material.id];
  const quantity = balance ? Number(balance.quantity) : 0;
  const unit = material.unit?.nameEn ?? material.unit?.code ?? "";
  const tone = getStockTone(quantity);
  const health = getStockHealthLabel(tone);

  return (
    <article
      className={cn(
        "group grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong sm:grid-cols-[56px_1fr_auto] sm:gap-4 sm:px-4 sm:py-3",
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
          <span className="font-mono text-[11px] leading-none text-fg-muted">{material.code}</span>
          <MaterialStatus material={material} />
          {stockByMaterialId && quantity >= 0 && (
            <Badge variant={health.variant} style={{ fontSize: "10.5px", padding: "1px 6px" }}>
              {health.label}
            </Badge>
          )}
        </div>
        <h2 className="mb-1 truncate text-sm font-semibold leading-tight text-fg" title={material.name}>
          {material.name}
        </h2>
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
            <p className="mb-0.5 text-[10px] uppercase leading-none tracking-[0.08em] text-fg-muted">คงเหลือ</p>
            <p
              className={cn(
                "text-lg font-bold leading-none tracking-[-0.01em] tabular-nums sm:text-xl",
                tone === "muted" ? "text-fg-muted" : tone === "warning" ? "text-warning" : "text-fg"
              )}
            >
              {formatNumber(quantity)}
              {unit && <span className="ml-1 text-[11px] font-medium text-fg-muted sm:text-xs">{unit}</span>}
            </p>
          </div>
        )}
        <RowActionsMenu
          itemLabel={material.name}
          actions={getMaterialRowActions(material, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails })}
        />
      </div>
    </article>
  );
}

// =====================================================================
// COLLECTION — switches between table / card / list. See AGENTS.md
// § Materials PC for the design rationale (Editorial + Compact combo).
// =====================================================================
export function MaterialPcCollection({
  materials,
  view,
  canEdit,
  canDelete,
  stockByMaterialId,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: MaterialCollectionProps) {
  const [previewTarget, setPreviewTarget] = useState<Material | null>(null);

  const commonProps = {
    canEdit,
    canDelete,
    stockByMaterialId,
    onEdit,
    onToggleStatus,
    onViewDetails,
    onPreview: setPreviewTarget,
  };

  return (
    <div className="@container">
      {view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <span className="sr-only">รูปภาพ</span>
                </TableHead>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>รูปทรง</TableHead>
                <TableHead>หน่วย</TableHead>
                <TableHead>ซัพพลายเออร์</TableHead>
                {stockByMaterialId && <TableHead>คงเหลือ</TableHead>}
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => {
                const balance = stockByMaterialId?.[material.id];
                const quantity = balance ? Number(balance.quantity) : 0;
                return (
                <TableRow key={material.id}>
                  <TableCell>
                    <MaterialThumbnail material={material} onPreview={setPreviewTarget} />
                  </TableCell>
                  <TableCell className="font-medium text-fg">{material.code}</TableCell>
                  <TableCell className="text-fg-secondary">{material.name}</TableCell>
                  <TableCell className="text-fg-muted">{shapeLabel(material)}</TableCell>
                  <TableCell className="text-fg-muted">{unitLabel(material)}</TableCell>
                  <TableCell className="text-fg-muted">{supplierNames(material)}</TableCell>
                  {stockByMaterialId && (
                    <TableCell className="text-fg-muted tabular-nums">
                      {formatNumber(quantity)}
                      {unitLabel(material) !== "—" && ` ${unitLabel(material)}`}
                    </TableCell>
                  )}
                  <TableCell>
                    <MaterialStatus material={material} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MaterialActions
                      material={material}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={onEdit}
                      onToggleStatus={onToggleStatus}
                      onViewDetails={onViewDetails}
                    />
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : view === "list" ? (
        <ul className="flex flex-col gap-2" aria-label="รายการวัสดุ PC แบบแถว">
          {materials.map((material) => (
            <li key={material.id}>
              <MaterialListItem material={material} {...commonProps} />
            </li>
          ))}
        </ul>
      ) : (
        <ul
          className="grid grid-cols-1 gap-3 @min-[40rem]:grid-cols-2 @min-[80rem]:grid-cols-4"
          aria-label="รายการวัสดุ PC แบบการ์ด"
        >
          {materials.map((material) => (
            <li key={material.id} className="min-w-0">
              <MaterialEditorialCard material={material} {...commonProps} />
            </li>
          ))}
        </ul>
      )}

      <MaterialPcImagePreview material={previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)} />
    </div>
  );
}

export function MaterialPcTable({
  materials,
  meta,
  view,
  canEdit,
  canDelete,
  stockByMaterialId,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: {
  materials: Material[];
  meta: PaginatedResult<Material>["meta"];
  view: ViewMode;
  canEdit: boolean;
  canDelete: boolean;
  stockByMaterialId: Record<string, StockBalance> | null;
  onEdit: (material: Material) => void;
  onToggleStatus: (material: Material) => void;
  onViewDetails: (material: Material) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-fg">ไม่พบวัสดุ PC</p>
        <p className="text-sm text-fg-muted">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <MaterialPcCollection
        materials={materials}
        view={view}
        canEdit={canEdit}
        canDelete={canDelete}
        stockByMaterialId={stockByMaterialId}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        onViewDetails={onViewDetails}
      />

      <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          หน้า {meta.page} จาก {Math.max(1, meta.totalPages)} · ทั้งหมด {meta.totalItems} รายการ
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
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
