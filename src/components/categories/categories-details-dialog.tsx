"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/api/categories";

// Read-only "view full record" dialog for a single Category. Mirrors
// MaterialPcDetailsDialog's structure: a header (identity + status), a
// Data Sheet with every field on the row, a created/updated line, and
// a footer with Close (and Edit when the viewer is permitted). Same
// `DialogContent fullScreenOnMobile size="lg"` recipe as Materials PC's
// details dialog — categories is a flat resource with only a few fields
// so the dialog is intentionally smaller than Materials PC's `size="xl"`.

// Two-column data sheet row — real `<table>` semantics so screen readers
// announce the label/value pair as a row relationship, not as a flat list
// of strings. Same shape as Materials PC's `DataSheetRow`, kept local
// (consistent with this project's "hand-write each resource's own dialog
// components, don't extract one generic component" preference — see
// AGENTS.md § Materials PC).
function DataSheetRow({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}) {
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

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

// Inner view — extracted from the public dialog so SSR tests can render it
// directly. Radix Dialog renders through a Portal which `renderToStaticMarkup`
// can't capture (see AGENTS.md § Row actions for the same Portal-capture
// limitation). The Dialog wrapper in the public component owns the modal
// chrome; this component owns the content layout.
export function CategoriesDetailsView({
  category,
  canEdit = false,
  onEdit,
  onClose,
}: {
  category: Category;
  canEdit?: boolean;
  onEdit?: (category: Category) => void;
  onClose: () => void;
}) {
  const iconColor = category.iconColor?.trim() || null;
  const nameEn = category.nameEn?.trim() || null;
  const description = category.description?.trim() || null;

  function handleEdit() {
    if (!onEdit) return;
    onEdit(category);
    onClose();
  }

  return (
    <div>
      {/* HERO — code eyebrow + Thai name + status badge. Code-only header
          keeps the focus on the row's primary identifier; the full name
          comes through below as the heading, matching Materials PC's hero. */}
      <header className="border-b border-border px-6 py-6">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.05em] text-fg-muted">{category.code}</p>
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-fg">
            {category.nameTh}
          </h2>
          {nameEn && <p className="text-sm text-fg-secondary">{nameEn}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={category.isActive ? "success" : "neutral"} dot>
              {category.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
            </Badge>
            <Badge variant="neutral">ลำดับ {category.sortOrder}</Badge>
            {iconColor && (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-fg-secondary"
              >
                <span
                  className="inline-block size-3 rounded-sm border border-border"
                  style={HEX_COLOR_PATTERN.test(iconColor) ? { backgroundColor: iconColor } : undefined}
                  aria-hidden="true"
                />
                {iconColor}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* DATA SHEET — every field on Category. Same DataSheetRow + table
          shape as Materials PC's details dialog so the two dialogs read
          the same way. `parentId` is omitted entirely (not shown as "—")
          because it isn't surfaced in the admin UI today and showing it
          here would imply it's editable when it isn't. */}
      <section className="px-6 py-5">
        <SectionLabel>ข้อมูลทั่วไป</SectionLabel>
        <DataSheetTable>
          <DataSheetRow label="รหัส" value={category.code} />
          <DataSheetRow label="ชื่อ (ไทย)" value={category.nameTh} />
          <DataSheetRow label="ชื่อ (อังกฤษ)" value={nameEn ?? "—"} />
          <DataSheetRow label="ลำดับ" value={String(category.sortOrder)} />
          <DataSheetRow
            label="สีไอคอน"
            value={
              iconColor ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block size-4 rounded-sm border border-border"
                    style={HEX_COLOR_PATTERN.test(iconColor) ? { backgroundColor: iconColor } : undefined}
                    aria-hidden="true"
                  />
                  {iconColor}
                </span>
              ) : (
                "—"
              )
            }
            fullWidth
          />
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
          เพิ่มเมื่อ <span className="text-fg-secondary">{formatDateTime(category.createdAt)}</span>
          <span className="mx-2 text-border-strong">·</span>
          แก้ไขล่าสุด <span className="text-fg-secondary">{formatDateTime(category.updatedAt)}</span>
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

export function CategoriesDetailsDialog({
  category,
  canEdit = false,
  onEdit,
  onOpenChange,
}: {
  category: Category | null;
  canEdit?: boolean;
  onEdit?: (category: Category) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!category) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="lg" className="p-0">
        <CategoriesDetailsView
          category={category}
          canEdit={canEdit}
          onEdit={onEdit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
