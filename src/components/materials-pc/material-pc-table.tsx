"use client";

import { useState, type ComponentType } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Pencil,
  Ban,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Ruler,
  Truck,
  Layers,
  Send,
  MapPin,
  Factory,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  // stock row is omitted entirely in that case (see AGENTS.md § Materials PC).
  stockByMaterialId: Record<string, StockBalance> | null;
  onEdit: (material: Material) => void;
  onToggleStatus: (material: Material) => void;
}

function MaterialStatus({ material }: { material: Material }) {
  return (
    <Badge variant={material.isActive ? "success" : "neutral"} dot>
      {material.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
    </Badge>
  );
}

// Side-by-side rectangular photo for the card header (identity comes first
// from the code/name/badges beside it, the photo is confirmation — not a
// full-width hero banner like an earlier version of this card used).
function MaterialCardPhoto({ material, onPreview }: { material: Material; onPreview: (material: Material) => void }) {
  const imagePath = material.imagePath?.trim() || null;
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const canShowImage = imagePath !== null && failedPath !== imagePath;

  if (!canShowImage) {
    return (
      <div
        className="flex h-32 w-full shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-fg-muted sm:h-28 sm:w-40"
        role="img"
        aria-label={`ไม่มีรูปภาพสำหรับ ${material.name}`}
      >
        <ImageOff className="size-6" aria-hidden="true" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(material)}
      aria-label={`ดูรูปภาพเต็มของ ${material.name}`}
      className="relative block h-32 w-full shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-border bg-surface-2 sm:h-28 sm:w-40"
    >
      <Image
        src={imagePath}
        alt={`Material image: ${material.name}`}
        fill
        sizes="(max-width: 40rem) 100vw, 10rem"
        className="object-cover"
        onError={() => setFailedPath(imagePath)}
      />
    </button>
  );
}

// One labelled fact inside a card's grouped-info block — icon + small muted
// label above a truncated value, so the block reads as a scannable list
// rather than a dense table squeezed into card width.
function MaterialCardFact({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-start gap-1.5 p-2.5", className)}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[11px] leading-none text-fg-muted">{label}</dt>
        <dd className="mt-1 truncate text-xs font-medium text-fg-secondary">{value}</dd>
      </div>
    </div>
  );
}

// Real stock-on-hand from cps-api's /stock-balances (see AGENTS.md § Materials
// PC) — a material with no receiving history yet has no row at all, which is
// quantity 0, not "unknown"/an error. Rendered as a single large centered
// stat (not a two-column price/stock split like a typical catalog card, and
// with no progress bar against a min/max) since materials have no price and
// no min/max-stock threshold field anywhere in the backend — only the
// current quantity is real.
function MaterialCardStock({ material, stockByMaterialId }: { material: Material; stockByMaterialId: Record<string, StockBalance> }) {
  const balance = stockByMaterialId[material.id];
  const quantity = balance ? Number(balance.quantity) : 0;
  const unit = material.unit?.nameEn ?? material.unit?.code ?? "";

  return (
    <div className="px-4 py-3 text-center">
      <p className="text-xs text-fg-muted">คงเหลือ</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-success">
        {formatNumber(quantity)}
        {unit && <span className="ml-1.5 text-sm font-normal text-fg-muted">{unit}</span>}
      </p>
    </div>
  );
}

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
  handlers: { onEdit: (material: Material) => void; onToggleStatus: (material: Material) => void }
): RowAction[] {
  const actions: RowAction[] = [];
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
}: Omit<MaterialCollectionProps, "materials" | "view" | "stockByMaterialId"> & { material: Material }) {
  return (
    <RowActionsMenu
      itemLabel={material.name}
      actions={getMaterialRowActions(material, canEdit, canDelete, { onEdit, onToggleStatus })}
    />
  );
}

export function MaterialPcCollection({
  materials,
  view,
  canEdit,
  canDelete,
  stockByMaterialId,
  onEdit,
  onToggleStatus,
}: MaterialCollectionProps) {
  const [previewTarget, setPreviewTarget] = useState<Material | null>(null);

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
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>
                    <MaterialThumbnail material={material} onPreview={setPreviewTarget} />
                  </TableCell>
                  <TableCell className="font-medium text-fg">{material.code}</TableCell>
                  <TableCell className="text-fg-secondary">{material.name}</TableCell>
                  <TableCell className="text-fg-muted">
                    {material.materialType}
                    {material.ratio ? ` · ${material.ratio}` : ""}
                  </TableCell>
                  <TableCell className="text-fg-muted">{material.unit?.nameEn ?? material.unit?.code ?? "—"}</TableCell>
                  <TableCell className="text-fg-muted">
                    {material.suppliers.length > 0 ? material.suppliers.length : "—"}
                  </TableCell>
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
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ul
          className="grid grid-cols-1 gap-3 @min-[32rem]:grid-cols-2"
          aria-label="รายการวัสดุ PC แบบการ์ด"
        >
          {materials.map((material) => (
          <li key={material.id} className="min-w-0">
            <Card className="flex h-full flex-col divide-y divide-border overflow-hidden transition-shadow duration-200 hover:shadow-md">
              {/* divide-y on the card itself draws a line between whichever
                  sections actually render — the stock stat below is
                  conditional (permission-gated), so a fixed border on that
                  one section alone would leave header/facts undivided
                  whenever it's absent. Photo + identity side by side — code,
                  name, status and shape badges. No separate English name
                  (Material has one `name` field, no nameTh/nameEn split) and
                  no category badge beyond shape, since Materials has no
                  distinct category field. */}
              <div className="flex flex-col gap-3 p-4 sm:flex-row">
                <MaterialCardPhoto material={material} onPreview={setPreviewTarget} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-fg-muted">
                    SKU <span className="ml-1 font-mono font-semibold text-fg">{material.code}</span>
                  </p>
                  <h2 className="mt-1 text-base font-bold text-fg" title={material.name}>
                    {material.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <MaterialStatus material={material} />
                    <Badge variant="neutral">
                      {material.materialType}
                      {material.ratio ? ` · ${material.ratio}` : ""}
                    </Badge>
                  </div>
                </div>
              </div>

              {stockByMaterialId && <MaterialCardStock material={material} stockByMaterialId={stockByMaterialId} />}

              <div className="flex-1 p-4">
                {/* Each fact gets its own bordered cell (right border on the
                    left column, bottom border on every row but the last) —
                    a divided grid like a small table, not just spaced-apart
                    items, so the six facts read as clearly separate values. */}
                <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-border [&>*]:border-border [&>*:not(:nth-last-child(-n+2))]:border-b [&>*:nth-child(odd)]:border-r">
                  <MaterialCardFact
                    icon={Truck}
                    label="ซัพพลายเออร์"
                    value={material.suppliers.length > 0 ? String(material.suppliers.length) : "—"}
                  />
                  <MaterialCardFact
                    icon={Layers}
                    label="รุ่น"
                    value={material.model?.nameEn ?? material.model?.code ?? "—"}
                  />
                  <MaterialCardFact
                    icon={Ruler}
                    label="หน่วย"
                    value={material.unit?.nameEn ?? material.unit?.code ?? "—"}
                  />
                  <MaterialCardFact
                    icon={Send}
                    label="ประเภทการจัดส่ง"
                    value={material.deliveryType?.nameEn ?? material.deliveryType?.code ?? "—"}
                  />
                  <MaterialCardFact
                    icon={MapPin}
                    label="จุดขึ้นสินค้า"
                    value={material.loadingPoint?.nameEn ?? material.loadingPoint?.code ?? "—"}
                  />
                  <MaterialCardFact icon={Factory} label="สายการผลิต" value={material.processLineName ?? "—"} />
                </dl>
              </div>

              {(canEdit || canDelete) && (
                <div className="flex items-center gap-2 p-3">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-primary/30 text-primary hover:bg-primary-soft"
                      onClick={() => onEdit(material)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> แก้ไข
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1",
                        material.isActive
                          ? "border-danger/30 text-danger hover:bg-danger-soft"
                          : "border-success/30 text-success hover:bg-success-soft"
                      )}
                      onClick={() => onToggleStatus(material)}
                    >
                      {material.isActive ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      {material.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </Button>
                  )}
                </div>
              )}
            </Card>
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
}: {
  materials: Material[];
  meta: PaginatedResult<Material>["meta"];
  view: ViewMode;
  canEdit: boolean;
  canDelete: boolean;
  stockByMaterialId: Record<string, StockBalance> | null;
  onEdit: (material: Material) => void;
  onToggleStatus: (material: Material) => void;
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
      />

      <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          หน้า {meta.page} จาก {Math.max(1, meta.totalPages)} · ทั้งหมด {meta.totalItems} รายการ
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => goToPage(meta.page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">ก่อนหน้า</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
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
