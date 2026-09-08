"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, CheckCircle2, Ban, Trash2, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import type { ViewMode } from "@/hooks/use-view-mode";
import type { MaterialReceiving, MaterialReceivingStatus } from "@/lib/api/materials-receiving";
import { cn, formatNumber } from "@/lib/utils";

// Read-only reference to the material's own photo (uploaded on
// /materials/pc, not something this resource owns) — same
// object-contain/ImageOff-fallback treatment as Materials PC's
// MaterialEditorialPhoto, minus the click-to-preview lightbox (no image
// preview dialog exists on this page, and the image is just context here,
// not the record being managed).
export function ReceivingMaterialPhoto({
  imagePath,
  materialName,
  className,
  iconClassName,
}: {
  imagePath: string | null | undefined;
  materialName: string;
  className?: string;
  iconClassName?: string;
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
        <ImageOff className={cn("size-7", iconClassName)} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden bg-surface-2", className)}>
      <Image
        src={trimmedPath}
        alt={`รูปวัสดุ: ${materialName}`}
        fill
        sizes="(min-width: 640px) 50vw, 100vw"
        className="object-contain p-3"
        onError={() => setFailedPath(trimmedPath)}
      />
    </span>
  );
}

const STATUS_DISPLAY: Record<MaterialReceivingStatus, { label: string; variant: "warning" | "success" | "neutral" }> = {
  draft: { label: "ร่าง", variant: "warning" },
  confirmed: { label: "ยืนยันแล้ว", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "neutral" },
};

// Ties color directly to status meaning (not decoration) — a soft gradient
// wash + left accent bar per status, using only existing design tokens, so
// a row/card's overall color mood is scannable before reading any text:
// draft = warm (needs attention/action), confirmed = settled/complete,
// cancelled = deliberately muted (already resolved, lowest priority).
// `barColor` is applied via inline style (not a `border-l-*` Tailwind
// class) because it has to win over the base `border-border` class on the
// same element for the same physical side — same specificity, same
// cascade layer, so which one wins is not reliably "whichever comes last
// in the className string" the way plain (non-layered) CSS behaves.
// Confirmed empirically: even reordering classes / re-declaring
// `@layer utilities` in a later <style> block did not make `border-l-success`
// beat `border-border`'s left-side longhand. An inline style avoids the
// ambiguity entirely.
const STATUS_ACCENT: Record<MaterialReceivingStatus, { wash: string; barColor: string }> = {
  draft: { wash: "from-warning-soft/70 via-surface-2 to-surface-2", barColor: "var(--warning)" },
  confirmed: { wash: "from-success-soft/60 via-surface-2 to-surface-2", barColor: "var(--success)" },
  cancelled: { wash: "from-surface-2 via-surface-2 to-surface-2", barColor: "var(--border-strong)" },
};

export function getMaterialsReceivingRowActions(
  receiving: MaterialReceiving,
  canConfirm: boolean,
  canCancel: boolean,
  canDelete: boolean,
  handlers: {
    onViewDetails: (receiving: MaterialReceiving) => void;
    onConfirm: (receiving: MaterialReceiving) => void;
    onCancel: (receiving: MaterialReceiving) => void;
    onDelete: (receiving: MaterialReceiving) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [
    { label: "ดูรายละเอียด", icon: Eye, onSelect: () => handlers.onViewDetails(receiving) },
  ];
  if (receiving.status === "draft" && canConfirm) {
    actions.push({ label: "ยืนยันการรับเข้า", icon: CheckCircle2, onSelect: () => handlers.onConfirm(receiving) });
  }
  if (receiving.status !== "cancelled" && canCancel) {
    actions.push({ label: "ยกเลิก", icon: Ban, onSelect: () => handlers.onCancel(receiving), variant: "danger" });
  }
  if (receiving.status === "draft" && canDelete) {
    actions.push({ label: "ลบร่าง", icon: Trash2, onSelect: () => handlers.onDelete(receiving), variant: "danger" });
  }
  return actions;
}

interface MaterialsReceivingRowProps {
  receiving: MaterialReceiving;
  canConfirm: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onViewDetails: (receiving: MaterialReceiving) => void;
  onConfirm: (receiving: MaterialReceiving) => void;
  onCancel: (receiving: MaterialReceiving) => void;
  onDelete: (receiving: MaterialReceiving) => void;
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
// CARD (view === "card") — same concept as Materials PC's Editorial card
// (see AGENTS.md § Materials PC): a photo-style tile with the status badge
// overlaid, code eyebrow → name → subtitle identity, a large data-hero
// stat with a badge beside it, then a bordered Data Sheet for the rest.
// This resource has no material photo of its own, so the tile holds a
// generic box icon instead of an image — everything else mirrors the
// pattern exactly so a user moving between /materials/pc and this page
// recognizes the same layout language.
// =====================================================================
function MaterialsReceivingCard({
  receiving,
  canConfirm,
  canCancel,
  canDelete,
  onViewDetails,
  onConfirm,
  onCancel,
  onDelete,
}: MaterialsReceivingRowProps) {
  const statusDisplay = STATUS_DISPLAY[receiving.status];
  const accent = STATUS_ACCENT[receiving.status];
  const actions = getMaterialsReceivingRowActions(receiving, canConfirm, canCancel, canDelete, {
    onViewDetails,
    onConfirm,
    onCancel,
    onDelete,
  });

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border-y border-r border-l-4 border-border bg-surface transition-shadow duration-200 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)]"
      style={{ borderLeftColor: accent.barColor }}
      role="group"
      aria-label={`บัตรรายการรับเข้า ${receiving.internalLotNo}`}
    >
      {/* Status wash — a soft gradient tinted by status (draft=warm/needs
          action, confirmed=settled, cancelled=muted) so the card's overall
          color mood is scannable before reading any text, not just a small
          badge in the corner. */}
      <div className={cn("relative aspect-[4/3] overflow-hidden bg-gradient-to-br", accent.wash)}>
        <div className="absolute inset-3">
          <ReceivingMaterialPhoto
            imagePath={receiving.material?.imagePath}
            materialName={receiving.material?.name ?? "ไม่ระบุวัสดุ"}
            className="h-full w-full rounded-[10px] bg-surface/70 backdrop-blur-[1px]"
          />
        </div>
        <div className="absolute right-3.5 top-3.5 z-10 flex items-center gap-1.5">
          <Badge variant={statusDisplay.variant}>{statusDisplay.label}</Badge>
          <RowActionsMenu actions={actions} itemLabel={receiving.internalLotNo} />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-[18px] pb-1 pt-[18px]">
        <p className="mb-2 font-mono text-[11px] leading-none tracking-[0.05em] text-fg-secondary">
          {receiving.internalLotNo}
        </p>
        <h2
          className="mb-1 truncate text-[17px] font-semibold leading-tight tracking-[-0.01em] text-fg"
          title={receiving.material?.name ?? ""}
        >
          {receiving.material?.name ?? "ไม่ระบุวัสดุ"}
        </h2>
        <p className="truncate text-[12.5px] leading-tight text-fg-secondary">
          {receiving.material?.code ?? "—"}
        </p>
      </div>

      {/* จำนวนรับเข้า is the single most important number on this card — a
          dedicated gradient panel (not just larger text) gives it its own
          visual "stage" so it reads as the headline stat, not one more line
          of data among many. */}
      <div className="mx-[18px] mb-3.5 mt-2.5 flex items-baseline justify-between gap-3 rounded-xl bg-gradient-to-br from-primary-soft/60 to-transparent px-3.5 py-3">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-primary">
            จำนวนรับเข้า
          </span>
          <div className="mt-1.5">
            <span className="text-[32px] font-bold leading-none tracking-[-0.025em] tabular-nums text-fg">
              {formatNumber(Number(receiving.receiveQuantity))}
            </span>
          </div>
        </div>
        <Badge variant="neutral" style={{ fontSize: "10.5px" }}>
          {receiving.packageCount} กล่อง
        </Badge>
      </div>

      <div className="border-t border-border">
        <table className="w-full text-sm">
          <tbody>
            <DataSheetRow label="Lot ภายใน (Internal Lot)" value={receiving.internalLotNo} />
            <DataSheetRow label="Lot ผู้ผลิต (Supplier Lot)" value={receiving.supplierLotNo ?? "—"} />
            <DataSheetRow label="วันที่รับเข้า" value={receiving.receiveDate} />
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 border-t border-border px-[18px] py-3">
        {/* "secondary" (a filled bg-surface-2), not "outline" — most rows
            are confirmed/cancelled and show this as the ONLY button, where
            a transparent-background outline button reads as barely-there
            against the card's own bg-surface. A filled background keeps it
            visibly a button on its own, without competing with "ยืนยัน"'s
            primary color when both are shown. */}
        <Button variant="secondary" size="sm" className="min-w-0 flex-1 px-2" onClick={() => onViewDetails(receiving)}>
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">ดูรายละเอียด</span>
        </Button>
        {receiving.status === "draft" && canConfirm && (
          <Button variant="primary" size="sm" className="min-w-0 flex-1 px-2" onClick={() => onConfirm(receiving)}>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">ยืนยัน</span>
          </Button>
        )}
      </div>
    </article>
  );
}

// =====================================================================
// COMPACT LIST ROW (view === "list") — one line per receiving, for
// scanning many rows at once. Mirrors Materials PC's Compact Row layout.
// =====================================================================
function MaterialsReceivingListItem({
  receiving,
  canConfirm,
  canCancel,
  canDelete,
  onViewDetails,
  onConfirm,
  onCancel,
  onDelete,
}: MaterialsReceivingRowProps) {
  const statusDisplay = STATUS_DISPLAY[receiving.status];
  const accent = STATUS_ACCENT[receiving.status];
  const actions = getMaterialsReceivingRowActions(receiving, canConfirm, canCancel, canDelete, {
    onViewDetails,
    onConfirm,
    onCancel,
    onDelete,
  });

  return (
    <article
      className={cn(
        "group grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border-y border-r border-l-4 border-border bg-gradient-to-r bg-surface px-3 py-2.5 transition-colors hover:border-border-strong sm:grid-cols-[auto_1fr_auto_auto] sm:gap-4 sm:px-4 sm:py-3",
        accent.wash,
        receiving.status === "cancelled" && "opacity-70"
      )}
      style={{ borderLeftColor: accent.barColor }}
      role="group"
      aria-label={`รายการรับเข้า ${receiving.internalLotNo}`}
    >
      <ReceivingMaterialPhoto
        imagePath={receiving.material?.imagePath}
        materialName={receiving.material?.name ?? "ไม่ระบุวัสดุ"}
        className="size-9 shrink-0 rounded-md border border-border sm:size-10"
        iconClassName="size-4"
      />

      <div className="col-span-2 min-w-0 sm:col-span-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium uppercase leading-none tracking-[0.06em] text-fg-muted">Lot ภายใน</span>
          <span className="font-mono text-[11px] font-semibold leading-none text-fg">{receiving.internalLotNo}</span>
          <Badge variant={statusDisplay.variant} style={{ fontSize: "10.5px", padding: "1px 6px" }}>
            {statusDisplay.label}
          </Badge>
        </div>
        <h2 className="mb-1 truncate text-sm font-semibold leading-tight text-fg" title={receiving.material?.name ?? ""}>
          {receiving.material?.code ?? "—"} · {receiving.material?.name ?? "ไม่ระบุวัสดุ"}
        </h2>
        <div className="flex items-center gap-2 truncate text-xs leading-tight text-fg-secondary">
          <span className="truncate">Lot ผู้ผลิต: {receiving.supplierLotNo ?? "—"}</span>
          <span aria-hidden="true" className="text-border-strong">·</span>
          <span className="truncate">{receiving.receiveDate}</span>
        </div>
      </div>

      <div className="text-right">
        <p className="mb-0.5 text-[10px] uppercase leading-none tracking-[0.08em] text-fg-muted">จำนวน / กล่อง</p>
        <p className="text-sm font-bold leading-none tracking-[-0.01em] tabular-nums text-fg sm:text-base">
          {formatNumber(Number(receiving.receiveQuantity))}
          <span className="ml-1 text-[11px] font-medium text-fg-muted">· {receiving.packageCount} กล่อง</span>
        </p>
      </div>

      <div className="flex items-center justify-end">
        <RowActionsMenu actions={actions} itemLabel={receiving.internalLotNo} />
      </div>
    </article>
  );
}

// =====================================================================
// COLLECTION — switches between table / card / list, same shape as
// MaterialPcCollection in material-pc-table.tsx (see AGENTS.md § Materials
// PC for the design rationale this mirrors).
// =====================================================================
export function MaterialsReceivingCollection({
  receivings,
  view,
  canConfirm,
  canCancel,
  canDelete,
  onViewDetails,
  onConfirm,
  onCancel,
  onDelete,
}: {
  receivings: MaterialReceiving[];
  view: ViewMode;
  canConfirm: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onViewDetails: (receiving: MaterialReceiving) => void;
  onConfirm: (receiving: MaterialReceiving) => void;
  onCancel: (receiving: MaterialReceiving) => void;
  onDelete: (receiving: MaterialReceiving) => void;
}) {
  const commonProps = { canConfirm, canCancel, canDelete, onViewDetails, onConfirm, onCancel, onDelete };

  if (view === "table") {
    return (
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วัสดุ</TableHead>
              <TableHead>หมายเลขล็อต</TableHead>
              <TableHead>จำนวน</TableHead>
              <TableHead>วันที่รับเข้า</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receivings.map((receiving) => {
              const statusDisplay = STATUS_DISPLAY[receiving.status];
              const accent = STATUS_ACCENT[receiving.status];
              const actions = getMaterialsReceivingRowActions(receiving, canConfirm, canCancel, canDelete, {
                onViewDetails,
                onConfirm,
                onCancel,
                onDelete,
              });
              return (
                <TableRow
                  key={receiving.id}
                  className={cn("border-l-4 bg-gradient-to-r", accent.wash, receiving.status === "cancelled" && "opacity-70")}
                  style={{ borderLeftColor: accent.barColor }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <ReceivingMaterialPhoto
                        imagePath={receiving.material?.imagePath}
                        materialName={receiving.material?.name ?? "ไม่ระบุวัสดุ"}
                        className="size-10 shrink-0 rounded-md"
                        iconClassName="size-4"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-fg">{receiving.material?.code ?? "—"}</div>
                        <div className="truncate text-xs text-fg-muted">{receiving.material?.name ?? ""}</div>
                      </div>
                    </div>
                  </TableCell>
                  {/* Internal Lot (our own tracking no.) and Supplier Lot
                      (the vendor's production batch) are two different
                      things that are easy to mistake for one another — kept
                      in one cell with explicit stacked labels rather than
                      two separate same-looking columns, so which is which
                      never depends on remembering the column header. */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div>
                        <span className="mr-1.5 text-[10px] uppercase tracking-wide text-fg-muted">Lot ภายใน</span>
                        <span className="font-mono text-xs font-semibold text-fg">{receiving.internalLotNo}</span>
                      </div>
                      <div>
                        <span className="mr-1.5 text-[10px] uppercase tracking-wide text-fg-muted">Lot ผู้ผลิต</span>
                        <span className="font-mono text-xs text-fg-secondary">{receiving.supplierLotNo ?? "—"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="tabular-nums font-medium text-fg">{formatNumber(Number(receiving.receiveQuantity))}</div>
                    <div className="text-xs text-fg-muted">{receiving.packageCount} กล่อง</div>
                  </TableCell>
                  <TableCell>{receiving.receiveDate}</TableCell>
                  <TableCell>
                    <Badge variant={statusDisplay.variant}>{statusDisplay.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActionsMenu actions={actions} itemLabel={receiving.internalLotNo} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (view === "list") {
    return (
      <ul className="flex flex-col gap-2" aria-label="รายการรับเข้าวัตถุดิบแบบแถว">
        {receivings.map((receiving) => (
          <li key={receiving.id}>
            <MaterialsReceivingListItem receiving={receiving} {...commonProps} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="@container">
      <ul
        className="grid grid-cols-1 gap-3 @min-[40rem]:grid-cols-2 @min-[80rem]:grid-cols-4"
        aria-label="รายการรับเข้าวัตถุดิบแบบการ์ด"
      >
        {receivings.map((receiving) => (
          <li key={receiving.id} className="min-w-0">
            <MaterialsReceivingCard receiving={receiving} {...commonProps} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MaterialsReceivingTable({
  receivings,
  totalItems,
  page,
  totalPages,
  view,
  canConfirm,
  canCancel,
  canDelete,
  onViewDetails,
  onConfirm,
  onCancel,
  onDelete,
}: {
  receivings: MaterialReceiving[];
  totalItems: number;
  page: number;
  totalPages: number;
  view: ViewMode;
  canConfirm: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onViewDetails: (receiving: MaterialReceiving) => void;
  onConfirm: (receiving: MaterialReceiving) => void;
  onCancel: (receiving: MaterialReceiving) => void;
  onDelete: (receiving: MaterialReceiving) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (receivings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-fg">ไม่พบรายการรับเข้าวัตถุดิบ</p>
        <p className="text-sm text-fg-muted">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <MaterialsReceivingCollection
        receivings={receivings}
        view={view}
        canConfirm={canConfirm}
        canCancel={canCancel}
        canDelete={canDelete}
        onViewDetails={onViewDetails}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onDelete={onDelete}
      />

      <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          หน้า {page} จาก {Math.max(1, totalPages)} · ทั้งหมด {totalItems} รายการ
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button
            variant="outline"
            size="sm"
            aria-label="หน้าก่อนหน้า"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">ก่อนหน้า</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="หน้าถัดไป"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            <span className="hidden sm:inline">ถัดไป</span> <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
