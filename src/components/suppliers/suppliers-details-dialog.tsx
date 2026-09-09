"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Supplier } from "@/lib/api/suppliers";

// Read-only "view full record" dialog for a single Supplier. Mirrors
// CategoriesDetailsDialog's / LoadingPointsDetailsDialog's /
// DeliveryTypesDetailsDialog's / RejectReasonsDetailsDialog's /
// MaterialModelsDetailsDialog's structure: a header (code + Thai name +
// status badge), a Data Sheet with every field on the row, an address
// block (only when non-empty), a created/updated line, and a footer
// with Close (and Edit when the viewer is permitted). Uses DialogContent
// size="xl" to accommodate the wider field set.

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
// which `renderToStaticMarkup` can't capture (see AGENTS.md § Row actions
// for the same Portal-capture limitation). The Dialog wrapper in the
// public component owns the modal chrome; this component owns the content
// layout.
export function SuppliersDetailsView({
  supplier,
  canEdit = false,
  onEdit,
  onClose,
}: {
  supplier: Supplier;
  canEdit?: boolean;
  onEdit?: (supplier: Supplier) => void;
  onClose: () => void;
}) {
  const nameEn = supplier.nameEn?.trim() || null;
  const address = supplier.address?.trim() || null;

  function handleEdit() {
    if (!onEdit) return;
    onEdit(supplier);
    onClose();
  }

  return (
    <div>
      {/* HERO — code eyebrow + Thai name + status badge */}
      <header className="border-b border-border px-6 py-6">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.05em] text-fg-muted">{supplier.code}</p>
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-fg">
            {supplier.nameTh}
          </h2>
          {nameEn && <p className="text-sm text-fg-secondary">{nameEn}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={supplier.isActive ? "success" : "neutral"} dot>
              {supplier.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
            </Badge>
          </div>
        </div>
      </header>

      {/* DATA SHEET */}
      <section className="px-6 py-5">
        <SectionLabel>ข้อมูลทั่วไป</SectionLabel>
        <DataSheetTable>
          <DataSheetRow label="รหัส" value={supplier.code} />
          <DataSheetRow label="ชื่อ (ไทย)" value={supplier.nameTh} />
          <DataSheetRow label="ชื่อ (อังกฤษ)" value={nameEn ?? "—"} />
          <DataSheetRow label="เลขประจำตัวผู้เสียภาษี" value={supplier.taxId ?? "—"} />
          <DataSheetRow label="ผู้ติดต่อ" value={supplier.contactName ?? "—"} />
          <DataSheetRow label="เบอร์โทรศัพท์" value={supplier.telephone ?? "—"} />
          <DataSheetRow label="อีเมล" value={supplier.email ?? "—"} />
        </DataSheetTable>
      </section>

      {address && (
        <section className="px-6 pb-5">
          <SectionLabel>ที่อยู่</SectionLabel>
          <div className="rounded-lg border border-border bg-surface-2 p-5 text-sm">
            <p className="whitespace-pre-line text-fg-secondary">{address}</p>
          </div>
        </section>
      )}

      <section className="px-6 pb-5">
        <p className="text-xs text-fg-muted">
          เพิ่มเมื่อ <span className="text-fg-secondary">{formatDateTime(supplier.createdAt)}</span>
          <span className="mx-2 text-border-strong">·</span>
          แก้ไขล่าสุด <span className="text-fg-secondary">{formatDateTime(supplier.updatedAt)}</span>
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

export function SuppliersDetailsDialog({
  supplier,
  canEdit = false,
  onEdit,
  onOpenChange,
}: {
  supplier: Supplier | null;
  canEdit?: boolean;
  onEdit?: (supplier: Supplier) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!supplier) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="p-0">
        <SuppliersDetailsView
          supplier={supplier}
          canEdit={canEdit}
          onEdit={onEdit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
