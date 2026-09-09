"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DeliveryType } from "@/lib/api/delivery-types";

// Read-only "view full record" dialog for a single Delivery Type. Mirrors
// CategoriesDetailsDialog's / LoadingPointsDetailsDialog's structure: a
// header (code + Thai name + status badge), a Data Sheet with every field
// on the row, a description block (only when non-empty), a created/updated
// line, and a footer with Close (and Edit when the viewer is permitted).
// Same DialogContent `fullScreenOnMobile size="lg"` recipe — delivery
// types is a small flat resource so the dialog is intentionally smaller
// than Materials PC's `size="xl"`.

// Two-column data sheet row — real `<table>` semantics so screen readers
// announce the label/value pair as a row relationship, not as a flat list
// of strings. Same shape as Materials PC's / Categories' / Loading Points'
// own `DataSheetRow`, kept local (consistent with this project's
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
export function DeliveryTypesDetailsView({
  deliveryType,
  canEdit = false,
  onEdit,
  onClose,
}: {
  deliveryType: DeliveryType;
  canEdit?: boolean;
  onEdit?: (deliveryType: DeliveryType) => void;
  onClose: () => void;
}) {
  const nameEn = deliveryType.nameEn?.trim() || null;
  const description = deliveryType.description?.trim() || null;

  function handleEdit() {
    if (!onEdit) return;
    onEdit(deliveryType);
    onClose();
  }

  return (
    <div>
      {/* HERO — code eyebrow + Thai name + status badge. Mirrors
          CategoriesDetailsView's / LoadingPointsDetailsView's hero
          structure so the three simple-master dialogs read the same way. */}
      <header className="border-b border-border px-6 py-6">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.05em] text-fg-muted">{deliveryType.code}</p>
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-fg">
            {deliveryType.nameTh}
          </h2>
          {nameEn && <p className="text-sm text-fg-secondary">{nameEn}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={deliveryType.isActive ? "success" : "neutral"} dot>
              {deliveryType.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
            </Badge>
          </div>
        </div>
      </header>

      {/* DATA SHEET — every field on DeliveryType. Same DataSheetRow +
          table shape as Categories' / Loading Points' details dialog so
          the three dialogs read the same way. Delivery type has the same
          number of fields as Loading Point, so the Data Sheet is the
          same length. */}
      <section className="px-6 py-5">
        <SectionLabel>ข้อมูลทั่วไป</SectionLabel>
        <DataSheetTable>
          <DataSheetRow label="รหัส" value={deliveryType.code} />
          <DataSheetRow label="ชื่อ (ไทย)" value={deliveryType.nameTh} />
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
          เพิ่มเมื่อ <span className="text-fg-secondary">{formatDateTime(deliveryType.createdAt)}</span>
          <span className="mx-2 text-border-strong">·</span>
          แก้ไขล่าสุด <span className="text-fg-secondary">{formatDateTime(deliveryType.updatedAt)}</span>
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

export function DeliveryTypesDetailsDialog({
  deliveryType,
  canEdit = false,
  onEdit,
  onOpenChange,
}: {
  deliveryType: DeliveryType | null;
  canEdit?: boolean;
  onEdit?: (deliveryType: DeliveryType) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!deliveryType) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="lg" className="p-0">
        <DeliveryTypesDetailsView
          deliveryType={deliveryType}
          canEdit={canEdit}
          onEdit={onEdit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
