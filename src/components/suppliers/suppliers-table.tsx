"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pencil, Ban, RotateCcw, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import type { Supplier, PaginatedSuppliers } from "@/lib/api/suppliers";

// Single-view (table-only) renderer for `/master-data/suppliers`.
// Suppliers is a flat master data resource, so the page is intentionally
// table-only — no Editorial card / Compact Row variant, mirroring the
// same design decision the other simple-master pages made (see AGENTS.md
// § Categories and § Loading Points).

interface SuppliersTableProps {
  suppliers: Supplier[];
  meta: PaginatedSuppliers["meta"];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (supplier: Supplier) => void;
  onToggleStatus: (supplier: Supplier) => void;
  onViewDetails: (supplier: Supplier) => void;
}

function SupplierStatus({ supplier }: { supplier: Supplier }) {
  return (
    <Badge variant={supplier.isActive ? "success" : "neutral"} dot>
      {supplier.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
    </Badge>
  );
}

// Pure — exported for tests. Same shape as the other simple-master
// `get*RowActions`: onViewDetails is optional so existing call
// sites/tests that only exercise edit/disable don't need a no-op, and
// "ดูรายละเอียด" is never permission-gated (viewing isn't a mutation).
// Enable/restore is "default" (not "danger") — re-enabling isn't destructive.
export function getSupplierRowActions(
  supplier: Supplier,
  canEdit: boolean,
  canDelete: boolean,
  handlers: {
    onEdit: (supplier: Supplier) => void;
    onToggleStatus: (supplier: Supplier) => void;
    onViewDetails?: (supplier: Supplier) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [];
  if (handlers.onViewDetails) {
    actions.push({
      label: "ดูรายละเอียด",
      icon: Eye,
      onSelect: () => handlers.onViewDetails!(supplier),
      variant: "default",
    });
  }
  if (canEdit) {
    actions.push({
      label: "แก้ไข",
      icon: Pencil,
      onSelect: () => handlers.onEdit(supplier),
      variant: "default",
    });
  }
  if (canDelete) {
    actions.push(
      supplier.isActive
        ? { label: "ปิดใช้งาน", icon: Ban, onSelect: () => handlers.onToggleStatus(supplier), variant: "danger" }
        : { label: "เปิดใช้งาน", icon: RotateCcw, onSelect: () => handlers.onToggleStatus(supplier), variant: "default" }
    );
  }
  return actions;
}

function SupplierActions({
  supplier,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: Omit<SuppliersTableProps, "suppliers" | "meta"> & { supplier: Supplier }) {
  return (
    <RowActionsMenu
      itemLabel={supplier.nameTh}
      actions={getSupplierRowActions(supplier, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails })}
    />
  );
}

export function SuppliersTable({
  suppliers,
  meta,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: SuppliersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-fg">ไม่พบผู้จัดจำหน่าย</p>
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
              <TableHead className="w-[12%]">รหัส</TableHead>
              <TableHead className="w-[22%]">ชื่อ (ไทย)</TableHead>
              <TableHead className="w-[22%]">อีเมล</TableHead>
              <TableHead className="w-[16%]">ผู้ติดต่อ</TableHead>
              <TableHead className="w-[14%]">สถานะ</TableHead>
              <TableHead className="w-[14%] text-right">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-mono text-[13px] tracking-[0.02em] text-fg">
                  {supplier.code}
                </TableCell>
                <TableCell className="font-medium text-fg">{supplier.nameTh}</TableCell>
                <TableCell className="text-fg-secondary">
                  {supplier.email?.trim() || "—"}
                </TableCell>
                <TableCell className="text-fg-secondary">
                  {supplier.contactName?.trim() || "—"}
                </TableCell>
                <TableCell>
                  <SupplierStatus supplier={supplier} />
                </TableCell>
                <TableCell className="text-right">
                  <SupplierActions
                    supplier={supplier}
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
