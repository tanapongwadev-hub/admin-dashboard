"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MasterDataResourceConfig, BaseMasterEntity, MasterDataFieldDef } from "@/lib/master-data/types";

// Generic read-only "view full record" dialog, shared by every simple-master
// resource — see AGENTS.md § Master-data generic CRUD page. Same hero + Data
// Sheet + description + created/updated-line + footer shape every
// hand-written `*-details-dialog.tsx` file already had; extra fields
// (Categories' sortOrder/iconColor, Suppliers' taxId/contactName/telephone/
// email, Units' symbol) come from `resource.fields`.

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
  return <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">{children}</h3>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function renderFieldPlain<TEntity extends BaseMasterEntity>(
  entity: TEntity,
  field: MasterDataFieldDef<TEntity>
): string {
  const raw = (entity as unknown as Record<string, unknown>)[field.name];
  if (field.type === "number") return typeof raw === "number" ? String(raw) : "—";
  if (field.type === "boolean") return raw === true ? "ใช่" : raw === false ? "ไม่ใช่" : "—";
  const str = typeof raw === "string" ? raw.trim() : "";
  return str || "—";
}

// Inner view — extracted from the public dialog so SSR tests can render it
// directly. Radix Dialog renders through a Portal which `renderToStaticMarkup`
// can't capture (see AGENTS.md § Row actions for the same Portal-capture
// limitation).
export function GenericMasterDataDetailsView<TEntity extends BaseMasterEntity>({
  resource,
  entity,
  canEdit = false,
  onEdit,
  onClose,
}: {
  resource: MasterDataResourceConfig<TEntity>;
  entity: TEntity;
  canEdit?: boolean;
  onEdit?: (entity: TEntity) => void;
  onClose: () => void;
}) {
  const nameEn = entity.nameEn?.trim() || null;
  const description = entity.description?.trim() || null;

  function handleEdit() {
    if (!onEdit) return;
    onEdit(entity);
    onClose();
  }

  const heroBadges = resource.fields.map((field) => field.heroBadge?.(entity) ?? null);

  return (
    <div>
      <header className="border-b border-border px-6 py-6">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.05em] text-fg-muted">{entity.code}</p>
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-fg">{entity.nameTh}</h2>
          {nameEn && <p className="text-sm text-fg-secondary">{nameEn}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={entity.isActive ? "success" : "neutral"} dot>
              {entity.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
            </Badge>
            {heroBadges.map((badge, i) => (
              <React.Fragment key={i}>{badge}</React.Fragment>
            ))}
          </div>
        </div>
      </header>

      <section className="px-6 py-5">
        <SectionLabel>ข้อมูลทั่วไป</SectionLabel>
        <DataSheetTable>
          <DataSheetRow label="รหัส" value={entity.code} />
          <DataSheetRow label="ชื่อ (ไทย)" value={entity.nameTh} />
          <DataSheetRow label="ชื่อ (อังกฤษ)" value={nameEn ?? "—"} />
          {resource.fields.map((field) => (
            <DataSheetRow
              key={field.name}
              label={field.label}
              value={field.detailValue ? field.detailValue(entity) : renderFieldPlain(entity, field)}
              fullWidth={field.fullWidth}
            />
          ))}
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
          เพิ่มเมื่อ <span className="text-fg-secondary">{formatDateTime(entity.createdAt)}</span>
          <span className="mx-2 text-border-strong">·</span>
          แก้ไขล่าสุด <span className="text-fg-secondary">{formatDateTime(entity.updatedAt)}</span>
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

export function GenericMasterDataDetailsDialog<TEntity extends BaseMasterEntity>({
  resource,
  entity,
  canEdit = false,
  onEdit,
  onOpenChange,
}: {
  resource: MasterDataResourceConfig<TEntity>;
  entity: TEntity | null;
  canEdit?: boolean;
  onEdit?: (entity: TEntity) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entity) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size={resource.dialogSize} className="p-0">
        <GenericMasterDataDetailsView
          resource={resource}
          entity={entity}
          canEdit={canEdit}
          onEdit={onEdit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
