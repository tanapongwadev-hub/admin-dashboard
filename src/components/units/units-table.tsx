"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pencil, Ban, RotateCcw, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import type { Unit, PaginatedUnits } from "@/lib/api/units";

// Single-view (table-only) renderer for `/master-data/units`.
// Units are flat master data with a small footprint (5 fields,
// no images), so the page is intentionally table-only — no
// Editorial card / Compact Row variant, mirroring the same
// design decision other simple-master pages made.

interface UnitsTableProps {
  units: Unit[];
  meta: PaginatedUnits["meta"];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (unit: Unit) => void;
  onToggleStatus: (unit: Unit) => void;
  onViewDetails: (unit: Unit) => void;
}

function UnitStatus({ unit }: { unit: Unit }) {
  return (
    <Badge variant={unit.isActive ? "success" : "neutral"} dot>
      {unit.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
    </Badge>
  );
}

// Pure — exported for tests. Enable/restore is "default" (not "danger") —
// re-enabling isn't destructive.
export function getUnitRowActions(
  unit: Unit,
  canEdit: boolean,
  canDelete: boolean,
  handlers: {
    onEdit: (unit: Unit) => void;
    onToggleStatus: (unit: Unit) => void;
    onViewDetails?: (unit: Unit) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [];
  if (handlers.onViewDetails) {
    actions.push({
      label: "ดูรายละเอียด",
      icon: Eye,
      onSelect: () => handlers.onViewDetails!(unit),
      variant: "default",
    });
  }
  if (canEdit) {
    actions.push({
      label: "แก้ไข",
      icon: Pencil,
      onSelect: () => handlers.onEdit(unit),
      variant: "default",
    });
  }
  if (canDelete) {
    actions.push(
      unit.isActive
        ? { label: "ปิดใช้งาน", icon: Ban, onSelect: () => handlers.onToggleStatus(unit), variant: "danger" }
        : { label: "เปิดใช้งาน", icon: RotateCcw, onSelect: () => handlers.onToggleStatus(unit), variant: "default" }
    );
  }
  return actions;
}

function UnitActions({
  unit,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: Omit<UnitsTableProps, "units" | "meta"> & { unit: Unit }) {
  return (
    <RowActionsMenu
      itemLabel={unit.nameTh}
      actions={getUnitRowActions(unit, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails })}
    />
  );
}

export function UnitsTable({
  units,
  meta,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: UnitsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-fg">ไม่พบหน่วยนับ</p>
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
              <TableHead className="w-[24%]">ชื่อ (ไทย)</TableHead>
              <TableHead className="w-[16%]">สัญลักษณ์</TableHead>
              <TableHead className="w-[14%]">สถานะ</TableHead>
              <TableHead className="w-[10%] text-right">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-mono text-[13px] tracking-[0.02em] text-fg">
                  {unit.code}
                </TableCell>
                <TableCell className="font-medium text-fg">{unit.nameTh}</TableCell>
                <TableCell className="text-fg-secondary">{unit.symbol ?? "—"}</TableCell>
                <TableCell>
                  <UnitStatus unit={unit} />
                </TableCell>
                <TableCell className="text-right">
                  <UnitActions
                    unit={unit}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                    onViewDetails={onViewDetails}
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
