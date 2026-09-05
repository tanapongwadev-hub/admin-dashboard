"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import type { Material, StockBalance } from "@/lib/api/materials";
import {
  shapeLabel,
  unitLabel,
  modelLabel,
  deliveryLabel,
  loadingPointLabel,
  processLineLabel,
  specificationLabel,
  descriptionLabel,
  supplierNames,
  getStockTone,
  getStockHealthLabel,
} from "@/components/materials-pc/material-pc-table";

// Two-column data sheet row — real `<table>` semantics so screen readers
// announce the label/value pair as a row relationship, not as a flat list
// of strings. The card view uses the same `DataSheetRow` shape, so the
// dialog and the card show identical key-value formatting.
function DataSheetRow({ label, value, fullWidth = false }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <th
        scope="row"
        className={cn(
          "py-2.5 pl-5 pr-3 text-left align-top text-[12.5px] font-normal text-fg-muted",
          fullWidth ? "sm:w-[28%]" : "sm:w-[36%]"
        )}
      >
        {label}
      </th>
      <td className="py-2.5 pr-5 text-left align-top text-[13px] font-medium text-fg break-words">{value}</td>
    </tr>
  );
}

// Section heading — uppercase eyebrow above a major zone. Consistent with
// the dialog's earlier sectioned layout; the new design reduces the number
// of sections (3 instead of 4) so the headings carry more weight.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">{children}</h3>
  );
}

// Two-column data sheet table — wraps the DataSheetRow in a real <table>
// with consistent cell padding.
function DataSheetTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

// Inner view — extracted from MaterialPcDetailsDialog so SSR tests can
// render it directly. Radix Dialog renders through a Portal which
// `renderToStaticMarkup` can't capture (see AGENTS.md § Row actions for the
// same Portal-capture limitation and how the project's existing tests handle
// it). The Dialog wrapper in the public component owns the modal chrome;
// this component owns the content layout.
export function MaterialPcDetailsView({
  material,
  stockByMaterialId,
  canEdit = false,
  onEdit,
  onClose,
}: {
  material: Material;
  stockByMaterialId: Record<string, StockBalance> | null;
  canEdit?: boolean;
  onEdit?: (material: Material) => void;
  onClose: () => void;
}) {
  const imagePath = material.imagePath?.trim() || null;
  const balance = stockByMaterialId?.[material.id];
  const quantity = balance ? Number(balance.quantity) : 0;
  const unit = unitLabel(material);
  const tone = getStockTone(quantity);
  const health = getStockHealthLabel(tone);
  const specification = material.specification?.trim() || null;
  const description = material.description?.trim() || null;

  function handleEdit() {
    if (!onEdit) return;
    onEdit(material);
    onClose();
  }

  return (
    <div>
      {/* HERO SECTION — image (left) + identity (right). Image at 320×240
          (was 280×210) — bigger so material photo details are easier to
          scan, especially the technical reference shots. Image stays
          `object-contain` so no technical detail is cropped. */}
      <header className="border-b border-border px-6 py-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2 sm:h-[240px] sm:w-[320px]">
            {imagePath ? (
              <Image
                src={imagePath}
                alt={`Material image: ${material.name}`}
                fill
                sizes="(min-width: 640px) 320px, 100vw"
                className="object-contain p-3"
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-fg-muted"
                role="img"
                aria-label={`ไม่มีรูปภาพสำหรับ ${material.name}`}
              >
                <ImageOff className="size-10" aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
            <p className="font-mono text-xs tracking-[0.05em] text-fg-muted">{material.code}</p>
            <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-fg">
              {material.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={material.isActive ? "success" : "neutral"} dot>
                {material.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
              </Badge>
              <Badge variant="neutral">{shapeLabel(material)}</Badge>
            </div>

            {/* Stock + actions row in the hero — keeps the most important
                number and the most common next action above the fold,
                instead of forcing a scroll to the bottom for either. */}
            <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-border pt-3">
              {stockByMaterialId ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">คงเหลือ</span>
                  <span
                    className={cn(
                      "text-2xl font-bold leading-none tabular-nums tracking-[-0.02em]",
                      tone === "warning" ? "text-warning" : tone === "muted" ? "text-fg-muted" : "text-fg"
                    )}
                  >
                    {formatNumber(quantity)}
                  </span>
                  {unit !== "—" && <span className="text-sm font-medium text-fg-muted">{unit}</span>}
                  <Badge variant={health.variant} style={{ fontSize: "10.5px" }}>
                    {health.label}
                  </Badge>
                </div>
              ) : (
                <span className="text-xs text-fg-muted">ไม่มีสิทธิ์ดูสต็อก</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* DATA SHEET SECTION — single 2-col table with all 6 essential
          fields, matching the card's new Data Sheet pattern. The two
          views now show identical key-value formatting (same `DataSheetRow`,
          same label/value alignment), so a user moving from card → dialog
          doesn't have to re-learn the layout. */}
      <section className="px-6 py-5">
        <SectionLabel>ข้อมูลจำเพาะ</SectionLabel>
        <DataSheetTable>
          <DataSheetRow label="ซัพพลายเออร์" value={supplierNames(material)} />
          <DataSheetRow label="รุ่น" value={modelLabel(material)} />
          <DataSheetRow label="หน่วย" value={unitLabel(material)} />
          <DataSheetRow label="ประเภทการจัดส่ง" value={deliveryLabel(material)} />
          <DataSheetRow label="จุดขึ้นสินค้า" value={loadingPointLabel(material)} fullWidth />
          <DataSheetRow label="สายการผลิต" value={processLineLabel(material)} fullWidth />
        </DataSheetTable>
      </section>

      {/* PROSE SECTION — only when at least one of the two free-text
          fields is non-empty. Spec + description render as full
          `whitespace-pre-line` text (not truncated — these are prose,
          not short labels). Each gets its own sub-heading inside the
          same block so it's clear which is which when both are present. */}
      {(specification || description) && (
        <section className="px-6 pb-5">
          <SectionLabel>รายละเอียดเพิ่มเติม</SectionLabel>
          <div className="space-y-4 rounded-lg border border-border bg-surface-2 p-5 text-sm">
            {specification && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-muted">ข้อมูลจำเพาะ</p>
                <p className="whitespace-pre-line text-fg-secondary">{specificationLabel(material)}</p>
              </div>
            )}
            {description && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-muted">รายละเอียด</p>
                <p className="whitespace-pre-line text-fg-secondary">{descriptionLabel(material)}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ACTIVITY LINE — single row at the bottom, not a card. Created /
          updated timestamps are reference info, not something to scan
          repeatedly; giving them their own card section would compete
          with the more important data above for the user's eye. */}
      <section className="px-6 pb-5">
        <p className="text-xs text-fg-muted">
          เพิ่มเมื่อ <span className="text-fg-secondary">{formatDateTime(material.createdAt)}</span>
          <span className="mx-2 text-border-strong">·</span>
          แก้ไขล่าสุด <span className="text-fg-secondary">{formatDateTime(material.updatedAt)}</span>
        </p>
      </section>

      <footer className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button variant="outline" onClick={onClose}>
          ปิด
        </Button>
        {canEdit && onEdit && (
          <Button variant="primary" onClick={handleEdit}>
            แก้ไข
          </Button>
        )}
      </footer>
    </div>
  );
}

export function MaterialPcDetailsDialog({
  material,
  stockByMaterialId,
  canEdit = false,
  onEdit,
  onOpenChange,
}: {
  material: Material | null;
  stockByMaterialId: Record<string, StockBalance> | null;
  // When true, footer renders an Edit button that closes the details dialog
  // and calls onEdit(material) — same handler the row's "แก้ไข" action uses,
  // which opens the existing MaterialPcFormDialog. Omitted callers (e.g. a
  // future read-only viewer) just see the Close button.
  canEdit?: boolean;
  onEdit?: (material: Material) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!material) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="p-0">
        <MaterialPcDetailsView
          material={material}
          stockByMaterialId={stockByMaterialId}
          canEdit={canEdit}
          onEdit={onEdit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
