"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Unit } from "@/lib/api/units";

// Read-only "view full record" dialog for a single Unit. Shape B+ — shows
// code, nameTh, nameEn, symbol, description, and isActive status. Mirrors
// the same structure as all other simple-master details dialogs:
// a header (code eyebrow + Thai name + status badge), a Data Sheet with
// every field, a description block (only when non-empty), a created/updated
// line, and a footer with Close (and Edit when the viewer is permitted).

// Two-column data sheet row — real `<table>` semantics so screen readers
// announce the label/value pair as a row relationship.
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

// Inner view — exported for tests. Radix Dialog renders through a Portal
// which `renderToStaticMarkup` can't capture.
export function UnitsDetailsView({
  unit,
  canEdit = false,
  onEdit,
  onClose,
}: {
  unit: Unit;
  canEdit?: boolean;
  onEdit?: (unit: Unit) => void;
  onClose: () => void;
}) {
  const nameEn = unit.nameEn?.trim() || null;
  const symbol = unit.symbol?.trim() || null;
  const description = unit.description?.trim() || null;

  function handleEdit() {
    if (!onEdit) return;
    onEdit(unit);
    onClose();
  }

  return (
    <div>
      {/* HERO — code eyebrow + Thai name + status badge */}
      <header className="border-b border-border px-6 py-6">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.05em] text-fg-muted">{unit.code}</p>
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-fg">
            {unit.nameTh}
          </h2>
          {nameEn && <p className="text-sm text-fg-secondary">{nameEn}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={unit.isActive ? "success" : "neutral"} dot>
              {unit.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
            </Badge>
          </div>
        </div>
      </header>

      {/* DATA SHEET */}
      <section className="px-6 py-5">
        <SectionLabel>ข้อมูลทั่วไป</SectionLabel>
        <DataSheetTable>
          <DataSheetRow label="รหัส" value={unit.code} />
          <DataSheetRow label="ชื่อ (ไทย)" value={unit.nameTh} />
          <DataSheetRow label="ชื่อ (อังกฤษ)" value={nameEn ?? "—"} />
          <DataSheetRow label="สัญลักษณ์" value={symbol ?? "—"} />
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
          เพิ่มเมื่อ <span className="text-fg-secondary">{formatDateTime(unit.createdAt)}</span>
          <span className="mx-2 text-border-strong">·</span>
          แก้ไขล่าสุด <span className="text-fg-secondary">{formatDateTime(unit.updatedAt)}</span>
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

export function UnitsDetailsDialog({
  unit,
  canEdit = false,
  onEdit,
  onOpenChange,
}: {
  unit: Unit | null;
  canEdit?: boolean;
  onEdit?: (unit: Unit) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!unit) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="lg" className="p-0">
        <UnitsDetailsView
          unit={unit}
          canEdit={canEdit}
          onEdit={onEdit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
