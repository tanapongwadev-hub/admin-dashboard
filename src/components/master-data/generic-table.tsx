"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pencil, Ban, RotateCcw, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import type { PaginatedResult } from "@/lib/api/create-resource-api";
import type { MasterDataResourceConfig, BaseMasterEntity, MasterDataFieldDef } from "@/lib/master-data/types";

// Generic table-only view, shared by every simple-master resource (none of
// the 7 has an image or a per-row stock number, so a Table/Editorial-card
// split like Materials PC's would just re-layout the same handful of
// fields — see AGENTS.md § Categories for the original rationale, which
// still holds project-wide). Extra columns come from `resource.fields`
// where `showInTable` is set.

export function getGenericRowActions<TEntity extends BaseMasterEntity>(
  entity: TEntity,
  canEdit: boolean,
  canDelete: boolean,
  handlers: {
    onEdit: (entity: TEntity) => void;
    onToggleStatus: (entity: TEntity) => void;
    onViewDetails?: (entity: TEntity) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [];
  if (handlers.onViewDetails) {
    actions.push({
      label: "ดูรายละเอียด",
      icon: Eye,
      onSelect: () => handlers.onViewDetails!(entity),
      variant: "default",
    });
  }
  if (canEdit) {
    actions.push({ label: "แก้ไข", icon: Pencil, onSelect: () => handlers.onEdit(entity), variant: "default" });
  }
  if (canDelete) {
    actions.push(
      entity.isActive
        ? { label: "ปิดใช้งาน", icon: Ban, onSelect: () => handlers.onToggleStatus(entity), variant: "danger" }
        : { label: "เปิดใช้งาน", icon: RotateCcw, onSelect: () => handlers.onToggleStatus(entity), variant: "default" }
    );
  }
  return actions;
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

export function GenericMasterDataTable<TEntity extends BaseMasterEntity>({
  resource,
  items,
  meta,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: {
  resource: MasterDataResourceConfig<TEntity>;
  items: TEntity[];
  meta: PaginatedResult<TEntity>["meta"];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (entity: TEntity) => void;
  onToggleStatus: (entity: TEntity) => void;
  onViewDetails: (entity: TEntity) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  const extraColumns = resource.fields.filter((f) => f.showInTable);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-fg">ไม่พบ{resource.entityLabel}</p>
        <p className="text-sm text-fg-muted">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[16%]">รหัส</TableHead>
              <TableHead className="w-[22%]">ชื่อ (ไทย)</TableHead>
              <TableHead className="w-[22%]">ชื่อ (อังกฤษ)</TableHead>
              {extraColumns.map((field) => (
                <TableHead key={field.name} style={field.tableWidth ? { width: field.tableWidth } : undefined}>
                  {field.label}
                </TableHead>
              ))}
              <TableHead className="w-[12%]">สถานะ</TableHead>
              <TableHead className="w-[8%] text-right">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((entity) => (
              <TableRow key={entity.id}>
                <TableCell className="font-mono text-[13px] tracking-[0.02em] text-fg">{entity.code}</TableCell>
                <TableCell className="font-medium text-fg">{entity.nameTh}</TableCell>
                <TableCell className="text-fg-secondary">{entity.nameEn?.trim() || "—"}</TableCell>
                {extraColumns.map((field) => (
                  <TableCell key={field.name} className="text-fg-secondary">
                    {field.tableRender ? field.tableRender(entity) : renderFieldPlain(entity, field)}
                  </TableCell>
                ))}
                <TableCell>
                  <Badge variant={entity.isActive ? "success" : "neutral"} dot>
                    {entity.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <RowActionsMenu
                    itemLabel={entity.nameTh}
                    actions={getGenericRowActions(entity, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          หน้า {meta.page} จาก {Math.max(1, meta.totalPages)} · ทั้งหมด {meta.totalItems} รายการ
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button
            variant="outline"
            size="sm"
            aria-label="หน้าก่อนหน้า"
            disabled={meta.page <= 1}
            onClick={() => goToPage(meta.page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">ก่อนหน้า</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="หน้าถัดไป"
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
