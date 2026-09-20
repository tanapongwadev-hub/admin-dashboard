"use client";

import { useState } from "react";
import Image from "next/image";
import { Boxes, Pencil, CheckCircle2, Ban, Trash2, Factory, PackageMinus, ImageOff, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import type { ViewMode } from "@/hooks/use-view-mode";
import { cn, formatNumber } from "@/lib/utils";
import type { MaterialsDisbursement, DisbursementStatus, DisbursementType } from "@/lib/api/materials-disbursement";

// Read-only reference to a material's own photo (uploaded on /materials/pc,
// not something this resource owns) — same object-contain/ImageOff-fallback
// treatment as Materials Receiving's ReceivingMaterialPhoto
// (materials-receiving-table.tsx), duplicated locally per this project's
// established "hand-write each resource's own card, don't extract one
// generic component" rule (see AGENTS.md § Materials PC). `fallbackIcon`
// lets a caller show something more specific than a generic ImageOff glyph
// when there's no image yet (e.g. the disbursement-type icon).
function DisbursementMaterialPhoto({
  imagePath,
  materialName,
  className,
  iconClassName,
  fallbackIcon: FallbackIcon = ImageOff,
}: {
  imagePath: string | null | undefined;
  materialName: string;
  className?: string;
  iconClassName?: string;
  fallbackIcon?: LucideIcon;
}) {
  const trimmedPath = imagePath?.trim() || null;
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const canShowImage = trimmedPath !== null && failedPath !== trimmedPath;

  if (!canShowImage) {
    return (
      <span
        className={cn("flex items-center justify-center bg-surface-2 text-fg-muted", className)}
        role="img"
        aria-label={`ไม่มีรูปภาพสำหรับ ${materialName}`}
      >
        <FallbackIcon className={cn("size-4", iconClassName)} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden bg-surface-2", className)}>
      <Image
        src={trimmedPath}
        alt={`รูปวัสดุ: ${materialName}`}
        fill
        sizes="80px"
        className="object-contain p-1"
        onError={() => setFailedPath(trimmedPath)}
      />
    </span>
  );
}

const STATUS_DISPLAY: Record<DisbursementStatus, { label: string; variant: "warning" | "success" | "neutral" }> = {
  draft: { label: "ร่าง", variant: "warning" },
  confirmed: { label: "ยืนยันแล้ว", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "neutral" },
};

const TYPE_LABELS: Record<DisbursementType, string> = {
  stock_cut: "ตัดสต็อก",
  production: "เบิกเพื่อผลิต",
};

// Same icon/tone pairing as materials-disbursement-form-dialog.tsx's
// TYPE_META — kept in sync manually (a shared module wasn't worth the
// indirection for 2 entries) so the type reads the same color/icon
// everywhere it appears: the create dialog, and now every list view here.
const TYPE_META: Record<DisbursementType, { icon: typeof Factory; tone: string }> = {
  production: { icon: Factory, tone: "bg-primary-soft text-primary" },
  stock_cut: { icon: PackageMinus, tone: "bg-warning-soft text-warning" },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

// Same status-driven color language as materials-receiving-table.tsx's
// STATUS_ACCENT (see AGENTS.md § Material Receiving: status-driven gradient
// accent) — draft = warm/needs action, confirmed = settled, cancelled =
// deliberately muted. `barColor` is applied via inline style, not a
// `border-l-*` Tailwind class, for the same cascade-precedence reason
// documented there.
const STATUS_ACCENT: Record<DisbursementStatus, { wash: string; barColor: string }> = {
  draft: { wash: "from-warning-soft/70 via-surface-2 to-surface-2", barColor: "var(--warning)" },
  confirmed: { wash: "from-success-soft/60 via-surface-2 to-surface-2", barColor: "var(--success)" },
  cancelled: { wash: "from-surface-2 via-surface-2 to-surface-2", barColor: "var(--border-strong)" },
};

function materialsSummary(items: MaterialsDisbursement["items"]): string {
  if (items.length === 0) return "—";
  const codes = items.map((item) => item.material?.code ?? "—");
  if (codes.length <= 2) return codes.join(", ");
  return `${codes.slice(0, 2).join(", ")} และอีก ${codes.length - 2} รายการ`;
}

function totalQuantity(disbursement: MaterialsDisbursement): number {
  return disbursement.items.reduce(
    (sum, item) =>
      sum + Number(disbursement.status === "draft" ? item.requestedQuantity : item.disbursedQuantity),
    0
  );
}

// Pure function, exported for tests — same "test the pure logic, not the
// Radix internals" split established by getMaterialsReceivingRowActions
// (see AGENTS.md § Row actions).
export function getMaterialsDisbursementRowActions(
  disbursement: MaterialsDisbursement,
  canUpdate: boolean,
  canConfirm: boolean,
  canCancel: boolean,
  canDelete: boolean,
  handlers: {
    onEdit: (disbursement: MaterialsDisbursement) => void;
    onConfirm: (disbursement: MaterialsDisbursement) => void;
    onCancel: (disbursement: MaterialsDisbursement) => void;
    onDelete: (disbursement: MaterialsDisbursement) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [];
  if (disbursement.status === "draft" && canUpdate) {
    actions.push({ label: "แก้ไข", icon: Pencil, onSelect: () => handlers.onEdit(disbursement) });
  }
  if (disbursement.status === "draft" && canConfirm) {
    actions.push({ label: "ยืนยันการจ่ายออก", icon: CheckCircle2, onSelect: () => handlers.onConfirm(disbursement) });
  }
  if (disbursement.status !== "cancelled" && canCancel) {
    actions.push({ label: "ยกเลิก", icon: Ban, onSelect: () => handlers.onCancel(disbursement), variant: "danger" });
  }
  if (disbursement.status === "draft" && canDelete) {
    actions.push({ label: "ลบร่าง", icon: Trash2, onSelect: () => handlers.onDelete(disbursement), variant: "danger" });
  }
  return actions;
}

interface MaterialsDisbursementRowProps {
  disbursement: MaterialsDisbursement;
  canUpdate: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onEdit: (disbursement: MaterialsDisbursement) => void;
  onConfirm: (disbursement: MaterialsDisbursement) => void;
  onCancel: (disbursement: MaterialsDisbursement) => void;
  onDelete: (disbursement: MaterialsDisbursement) => void;
}

function DataSheetRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <th scope="row" className="w-[42%] py-2.5 pl-[18px] pr-3 text-left align-top text-[12.5px] font-normal text-fg-muted">
        {label}
      </th>
      <td className="py-2.5 pr-[18px] text-left align-top text-[13px] font-medium text-fg break-words">{value}</td>
    </tr>
  );
}

// =====================================================================
// CARD (view === "card") — same concept as Materials Receiving's Editorial
// card (see AGENTS.md § Materials PC / § Material Receiving card view):
// photo-style tile with the status badge overlaid, code eyebrow → headline
// → subtitle identity, a data-hero stat with a badge beside it, then a
// bordered Data Sheet. This resource has no single photo (a disbursement
// can span several materials) so the tile holds the disbursement-type icon
// instead — everything else mirrors the pattern.
// =====================================================================
function MaterialsDisbursementCard({
  disbursement,
  canUpdate,
  canConfirm,
  canCancel,
  canDelete,
  onEdit,
  onConfirm,
  onCancel,
  onDelete,
}: MaterialsDisbursementRowProps) {
  const statusDisplay = STATUS_DISPLAY[disbursement.status];
  const accent = STATUS_ACCENT[disbursement.status];
  const typeMeta = TYPE_META[disbursement.disbursementType];
  const TypeIcon = typeMeta.icon;
  const actions = getMaterialsDisbursementRowActions(disbursement, canUpdate, canConfirm, canCancel, canDelete, {
    onEdit,
    onConfirm,
    onCancel,
    onDelete,
  });
  const total = totalQuantity(disbursement);
  const showActionRow = disbursement.status === "draft" && (canUpdate || canConfirm);

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border-y border-r border-l-4 border-border bg-surface transition-shadow duration-200 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)]"
      style={{ borderLeftColor: accent.barColor }}
      role="group"
      aria-label={`บัตรรายการจ่ายออก ${disbursement.disbursementNo}`}
    >
      <div className={cn("relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br", accent.wash)}>
        {disbursement.items.length === 0 ? (
          <span className={cn("flex size-14 items-center justify-center rounded-2xl bg-surface/80 backdrop-blur-[1px]", typeMeta.tone)}>
            <TypeIcon className="size-7" aria-hidden="true" />
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {disbursement.items.slice(0, 3).map((item) => (
              <DisbursementMaterialPhoto
                key={item.id}
                imagePath={item.material?.imagePath}
                materialName={item.material?.name ?? "ไม่ระบุวัสดุ"}
                className="size-16 shrink-0 rounded-xl border-2 border-surface bg-surface/80 backdrop-blur-[1px]"
                iconClassName="size-6"
              />
            ))}
            {disbursement.items.length > 3 && (
              <span className="flex size-16 shrink-0 items-center justify-center rounded-xl border-2 border-surface bg-surface/80 text-sm font-semibold text-fg-secondary backdrop-blur-[1px]">
                +{disbursement.items.length - 3}
              </span>
            )}
          </div>
        )}
        {/* Type icon as a small corner badge — the material photos above are
            now the primary visual, so the type identity moves to a compact
            accessory rather than owning the whole tile. */}
        <span className={cn("absolute bottom-3.5 left-3.5 z-10 flex size-7 items-center justify-center rounded-md", typeMeta.tone)}>
          <TypeIcon className="size-3.5" aria-hidden="true" />
        </span>
        <div className="absolute right-3.5 top-3.5 z-10 flex items-center gap-1.5">
          <Badge variant={statusDisplay.variant}>{statusDisplay.label}</Badge>
          <RowActionsMenu actions={actions} itemLabel={disbursement.disbursementNo} />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-[18px] pb-1 pt-[18px]">
        <p className="mb-2 font-mono text-[11px] leading-none tracking-[0.05em] text-fg-secondary">
          {disbursement.disbursementNo}
        </p>
        <h2
          className="mb-1 truncate text-[17px] font-semibold leading-tight tracking-[-0.01em] text-fg"
          title={materialsSummary(disbursement.items)}
        >
          {materialsSummary(disbursement.items)}
        </h2>
        <p className="truncate text-[12.5px] leading-tight text-fg-secondary">{TYPE_LABELS[disbursement.disbursementType]}</p>
      </div>

      <div className="mx-[18px] mb-3.5 mt-2.5 flex items-baseline justify-between gap-3 rounded-xl bg-gradient-to-br from-primary-soft/60 to-transparent px-3.5 py-3">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-primary">
            {disbursement.status === "draft" ? "จำนวนที่ขอเบิก" : "จำนวนที่จ่ายออก"}
          </span>
          <div className="mt-1.5">
            <span className="text-[32px] font-bold leading-none tracking-[-0.025em] tabular-nums text-fg">
              {formatNumber(total)}
            </span>
          </div>
        </div>
        <Badge variant="neutral" style={{ fontSize: "10.5px" }}>
          {disbursement.items.length} รายการ
        </Badge>
      </div>

      <div className="border-t border-border">
        <table className="w-full text-sm">
          <tbody>
            <DataSheetRow label="ประเภทการจ่ายออก" value={TYPE_LABELS[disbursement.disbursementType]} />
            <DataSheetRow label="วันที่จ่ายออก" value={formatDate(disbursement.disbursementDate)} />
            <DataSheetRow label="เหตุผล / หมายเหตุ" value={disbursement.reason || disbursement.remark || "—"} />
          </tbody>
        </table>
      </div>

      {showActionRow && (
        <div className="flex gap-2 border-t border-border px-[18px] py-3">
          {canUpdate && (
            <Button variant="secondary" size="sm" className="min-w-0 flex-1 px-2" onClick={() => onEdit(disbursement)}>
              <Pencil className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">แก้ไข</span>
            </Button>
          )}
          {canConfirm && (
            <Button variant="primary" size="sm" className="min-w-0 flex-1 px-2" onClick={() => onConfirm(disbursement)}>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">ยืนยัน</span>
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

// =====================================================================
// COMPACT LIST ROW (view === "list") — one line per disbursement, for
// scanning many rows at once. Mirrors Materials Receiving's Compact Row.
// =====================================================================
function MaterialsDisbursementListItem({
  disbursement,
  canUpdate,
  canConfirm,
  canCancel,
  canDelete,
  onEdit,
  onConfirm,
  onCancel,
  onDelete,
}: MaterialsDisbursementRowProps) {
  const statusDisplay = STATUS_DISPLAY[disbursement.status];
  const accent = STATUS_ACCENT[disbursement.status];
  const typeMeta = TYPE_META[disbursement.disbursementType];
  const TypeIcon = typeMeta.icon;
  const actions = getMaterialsDisbursementRowActions(disbursement, canUpdate, canConfirm, canCancel, canDelete, {
    onEdit,
    onConfirm,
    onCancel,
    onDelete,
  });
  const total = totalQuantity(disbursement);

  return (
    <article
      className={cn(
        "group grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border-y border-r border-l-4 border-border bg-gradient-to-r bg-surface px-3 py-2.5 transition-colors hover:border-border-strong sm:grid-cols-[auto_1fr_auto_auto] sm:gap-4 sm:px-4 sm:py-3",
        accent.wash,
        disbursement.status === "cancelled" && "opacity-70"
      )}
      style={{ borderLeftColor: accent.barColor }}
      role="group"
      aria-label={`รายการจ่ายออก ${disbursement.disbursementNo}`}
    >
      <DisbursementMaterialPhoto
        imagePath={disbursement.items[0]?.material?.imagePath}
        materialName={disbursement.items[0]?.material?.name ?? "ไม่ระบุวัสดุ"}
        className="hidden size-9 shrink-0 rounded-md border border-border sm:flex sm:size-10"
        iconClassName="size-4"
        fallbackIcon={TypeIcon}
      />

      <div className="col-span-2 min-w-0 sm:col-span-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-semibold leading-none text-fg">{disbursement.disbursementNo}</span>
          <Badge variant={statusDisplay.variant} style={{ fontSize: "10.5px", padding: "1px 6px" }}>
            {statusDisplay.label}
          </Badge>
        </div>
        <h2 className="mb-1 truncate text-sm font-semibold leading-tight text-fg" title={materialsSummary(disbursement.items)}>
          {materialsSummary(disbursement.items)}
        </h2>
        <div className="flex items-center gap-2 truncate text-xs leading-tight text-fg-secondary">
          <span className="truncate">{TYPE_LABELS[disbursement.disbursementType]}</span>
          <span aria-hidden="true" className="text-border-strong">·</span>
          <span className="truncate">{formatDate(disbursement.disbursementDate)}</span>
        </div>
      </div>

      <div className="text-right">
        <p className="mb-0.5 text-[10px] uppercase leading-none tracking-[0.08em] text-fg-muted">
          {disbursement.status === "draft" ? "ขอเบิก" : "จ่ายออก"}
        </p>
        <p className="text-sm font-bold leading-none tracking-[-0.01em] tabular-nums text-fg sm:text-base">
          {formatNumber(total)}
          <span className="ml-1 text-[11px] font-medium text-fg-muted">· {disbursement.items.length} รายการ</span>
        </p>
      </div>

      <div className="flex items-center justify-end">
        <RowActionsMenu actions={actions} itemLabel={disbursement.disbursementNo} />
      </div>
    </article>
  );
}

// =====================================================================
// COLLECTION — switches between table / card / list, same shape as
// MaterialsReceivingCollection (see materials-receiving-table.tsx).
// =====================================================================
function MaterialsDisbursementCollection({
  disbursements,
  view,
  canUpdate,
  canConfirm,
  canCancel,
  canDelete,
  onEdit,
  onConfirm,
  onCancel,
  onDelete,
}: {
  disbursements: MaterialsDisbursement[];
  view: ViewMode;
  canUpdate: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onEdit: (disbursement: MaterialsDisbursement) => void;
  onConfirm: (disbursement: MaterialsDisbursement) => void;
  onCancel: (disbursement: MaterialsDisbursement) => void;
  onDelete: (disbursement: MaterialsDisbursement) => void;
}) {
  const commonProps = { canUpdate, canConfirm, canCancel, canDelete, onEdit, onConfirm, onCancel, onDelete };

  if (view === "list") {
    return (
      <ul className="flex flex-col gap-2" aria-label="รายการจ่ายออกวัสดุแบบแถว">
        {disbursements.map((disbursement) => (
          <li key={disbursement.id}>
            <MaterialsDisbursementListItem disbursement={disbursement} {...commonProps} />
          </li>
        ))}
      </ul>
    );
  }

  if (view === "card") {
    return (
      <div className="@container">
        <ul
          className="grid grid-cols-1 gap-3 @min-[40rem]:grid-cols-2 @min-[80rem]:grid-cols-4"
          aria-label="รายการจ่ายออกวัสดุแบบการ์ด"
        >
          {disbursements.map((disbursement) => (
            <li key={disbursement.id} className="min-w-0">
              <MaterialsDisbursementCard disbursement={disbursement} {...commonProps} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="max-h-[68vh] overflow-auto rounded-md border border-border bg-surface">
      <Table>
        <TableHeader className="sticky top-0 z-20 bg-surface shadow-[0_1px_0_0_var(--border)]">
          <TableRow>
            <TableHead>วัสดุ</TableHead>
            <TableHead>เลขที่ใบจ่ายออก</TableHead>
            <TableHead className="text-right">จำนวนที่จ่าย</TableHead>
            <TableHead>วันที่จ่ายออก</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="w-px text-right">การจัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {disbursements.map((disbursement) => {
            const status = STATUS_DISPLAY[disbursement.status];
            const accent = STATUS_ACCENT[disbursement.status];
            const actions = getMaterialsDisbursementRowActions(
              disbursement,
              canUpdate,
              canConfirm,
              canCancel,
              canDelete,
              { onEdit, onConfirm, onCancel, onDelete }
            );
            return (
              <TableRow
                key={disbursement.id}
                className={cn("border-l-4 bg-gradient-to-r", accent.wash, disbursement.status === "cancelled" && "opacity-70")}
                style={{ borderLeftColor: accent.barColor }}
              >
                <TableCell className="text-fg-secondary">
                  {disbursement.items.length === 0 ? (
                    "—"
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {disbursement.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <DisbursementMaterialPhoto
                            imagePath={item.material?.imagePath}
                            materialName={item.material?.name ?? "ไม่ระบุวัสดุ"}
                            className="size-8 shrink-0 rounded-md"
                            iconClassName="size-3.5"
                          />
                          <span className="whitespace-nowrap">
                            <span className="font-mono text-xs text-fg-muted">{item.material?.code ?? "—"}</span>{" "}
                            {item.material?.name ?? ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TableCell>
                {/* เลขที่ใบจ่ายออก + ประเภท kept in one cell with stacked mini
                    labels, same technique materials-receiving-table.tsx uses
                    to pair Internal Lot/Supplier Lot — the two go together
                    conceptually (a doc number always has a type), so they
                    read together instead of splitting across two columns. */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div>
                      <span className="mr-1.5 text-[10px] uppercase tracking-wide text-fg-muted">เลขที่ใบจ่ายออก</span>
                      <span className="font-mono text-xs font-semibold text-fg">{disbursement.disbursementNo}</span>
                    </div>
                    <div>
                      <span className="mr-1.5 text-[10px] uppercase tracking-wide text-fg-muted">ประเภท</span>
                      <span className="text-xs text-fg-secondary">{TYPE_LABELS[disbursement.disbursementType]}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-fg">
                  {disbursement.status === "draft"
                    ? disbursement.items.map((item) => formatNumber(Number(item.requestedQuantity))).join(", ") || "—"
                    : disbursement.items.map((item) => formatNumber(Number(item.disbursedQuantity))).join(", ") || "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-fg-muted">{formatDate(disbursement.disbursementDate)}</TableCell>
                <TableCell>
                  <Badge variant={status.variant} dot>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <RowActionsMenu actions={actions} itemLabel={disbursement.disbursementNo} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function MaterialsDisbursementTable({
  disbursements,
  view,
  canUpdate,
  canConfirm,
  canCancel,
  canDelete,
  onEdit,
  onConfirm,
  onCancel,
  onDelete,
}: {
  disbursements: MaterialsDisbursement[];
  view: ViewMode;
  canUpdate: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onEdit: (disbursement: MaterialsDisbursement) => void;
  onConfirm: (disbursement: MaterialsDisbursement) => void;
  onCancel: (disbursement: MaterialsDisbursement) => void;
  onDelete: (disbursement: MaterialsDisbursement) => void;
}) {
  if (disbursements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <Boxes className="size-7 text-fg-muted" aria-hidden="true" />
        <p className="text-sm font-medium text-fg">ยังไม่มีรายการจ่ายออก</p>
        <p className="text-sm text-fg-muted">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
      </div>
    );
  }

  return (
    <MaterialsDisbursementCollection
      disbursements={disbursements}
      view={view}
      canUpdate={canUpdate}
      canConfirm={canConfirm}
      canCancel={canCancel}
      canDelete={canDelete}
      onEdit={onEdit}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onDelete={onDelete}
    />
  );
}
