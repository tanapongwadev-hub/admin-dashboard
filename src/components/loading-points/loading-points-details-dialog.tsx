"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LoadingPoint } from "@/lib/api/loading-points";

// Read-only "view full record" dialog for a single Loading Point. Mirrors
// CategoriesDetailsDialog's structure: a header (code + Thai name + status
// badge), a Data Sheet with every field on the row, a description block
// (only when non-empty), a created/updated line, and a footer with Close
// (and Edit when the viewer is permitted). Same DialogContent
// `fullScreenOnMobile size="lg"` recipe — loading points is a small flat
// resource so the dialog is intentionally smaller than Materials PC's
// `size="xl"`.

// Two-column data sheet row — real `<table>` semantics so screen readers
// announce the label/value pair as a row relationship, not as a flat list
// of strings. Same shape as Materials PC's and Categories' own
// `DataSheetRow`, kept local (consistent with this project's
// "hand-write each resource's own dialog components, don't extract one
// generic component" preference — see AGENTS.md § Materials PC).
function DataSheetRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <th
        scope="row"
        className="w-[36%] py-2.5 pl-5 pr-3 text-left align-top text-[12.5px] font-normal text-fg-muted sm:w-[28%]"
      >
        {label}
      </th>
      <td className="py-2.5 pr-5 text-left align-top text-[13px] font-medium text-fg break-words">{value}</td>
    </tr>
  );
}

function DataSheetTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">{children}</h3>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

// Inner view — extracted from the public dialog so SSR tests can render it
// directly. Radix Dialog renders through a Portal which `renderToStaticMarkup`
// can't capture (see AGENTS.md § Row actions for the same Portal-capture
// limitation). The Dialog wrapper in the public component owns the modal
// chrome; this component owns the content layout.
export function LoadingPointsDetailsView({
  loadingPoint,
  canEdit = false,
  onEdit,
  onClose,
}: {
  loadingPoint: LoadingPoint;
  canEdit?: boolean;
  onEdit?: (loadingPoint: LoadingPoint) => void;
  onClose: () => void;
}) {
  const nameEn = loadingPoint.nameEn?.trim() || null;
  const description = loadingPoint.description?.trim() || null;

  function handleEdit() {
    if (!onEdit) return;
    onEdit(loadingPoint);
    onClose();
  }

  return (
    <div>
      {/* HERO — code eyebrow + Thai name + status badge. Mirrors
          CategoriesDetailsView's hero structure so the two simple-master
          dialogs read the same way. */}
      <header className="border-b border-border px-6 py-6">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.05em] text-fg-muted">{loadingPoint.code}</p>
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-fg">
            {loadingPoint.nameTh}
          </h2>
          {nameEn && <p className="text-sm text-fg-secondary">{nameEn}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={loadingPoint.isActive ? "success" : "neutral"} dot>
              {loadingPoint.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
            </Badge>
          </div>
        </div>
      </header>

      {/* DATA SHEET — every field on LoadingPoint. Same DataSheetRow + table
          shape as Categories' details dialog so the two dialogs read the
          same way. Loading point has fewer fields than categories, so the
          Data Sheet is shorter. */}
      <section className="px-6 py-5">
        <SectionLabel>ข้อมูลทั่วไป</SectionLabel>
        <DataSheetTable>
          <DataSheetRow label="รหัส" value={loadingPoint.code} />
          <DataSheetRow label="ชื่อ (ไทย)" value={loadingPoint.nameTh} />
          <DataSheetRow label="ชื่อ (อังกฤษ)" value={nameEn ?? "—"} />
        </DataSheetTable>
      </section>

      {description && (
        <section className="px-6 pb-5">
          <SectionLabel>คำอธิบาย</SectionLabel>
          <div className="rounded-lg border border-border bg-surface-2 p-5 text-sm">
            <p className="whitespace-pre-line text-fg-secondary">{description}</p>
          </div>
        </section>
      )}

      <section className="px-6 pb-5">
        <p className="text-xs text-fg-muted">
          เพิ่มเมื่อ <span className="text-fg-secondary">{formatDateTime(loadingPoint.createdAt)}</span>
          <span className="mx-2 text-border-strong">·</span>
          แก้ไขล่าสุด <span className="text-fg-secondary">{formatDateTime(loadingPoint.updatedAt)}</span>
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

export function LoadingPointsDetailsDialog({
  loadingPoint,
  canEdit = false,
  onEdit,
  onOpenChange,
}: {
  loadingPoint: LoadingPoint | null;
  canEdit?: boolean;
  onEdit?: (loadingPoint: LoadingPoint) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!loadingPoint) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="lg" className="p-0">
        <LoadingPointsDetailsView
          loadingPoint={loadingPoint}
          canEdit={canEdit}
          onEdit={onEdit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
