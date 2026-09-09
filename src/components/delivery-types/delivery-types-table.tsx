"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pencil, Ban, RotateCcw, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import type { DeliveryType, PaginatedDeliveryTypes } from "@/lib/api/delivery-types";

// Single-view (table-only) renderer for `/master-data/delivery-types`.
// Delivery types are flat master data with a small footprint (4 fields,
// no images, no per-row stock/health numbers), so the page is intentionally
// table-only — no Editorial card / Compact Row variant, mirroring the
// same design decision the Categories and Loading Points pages made for
// the same reason (see AGENTS.md § Categories and § Loading Points). The
// shared `useViewMode`/`ViewToggle` primitives are ready to reuse if a
// real need shows up.

interface DeliveryTypesTableProps {
  deliveryTypes: DeliveryType[];
  meta: PaginatedDeliveryTypes["meta"];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (deliveryType: DeliveryType) => void;
  onToggleStatus: (deliveryType: DeliveryType) => void;
  onViewDetails: (deliveryType: DeliveryType) => void;
}

function DeliveryTypeStatus({ deliveryType }: { deliveryType: DeliveryType }) {
  return (
    <Badge variant={deliveryType.isActive ? "success" : "neutral"} dot>
      {deliveryType.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
    </Badge>
  );
}

// Pure — exported for tests. Same shape as Materials PC's
// getMaterialRowActions: onViewDetails is optional so existing call
// sites/tests that only exercise edit/disable don't need a no-op, and
// "ดูรายละเอียด" is never permission-gated (viewing isn't a mutation).
// Enable/restore is "default" (not "danger") — re-enabling isn't destructive.
export function getDeliveryTypeRowActions(
  deliveryType: DeliveryType,
  canEdit: boolean,
  canDelete: boolean,
  handlers: {
    onEdit: (deliveryType: DeliveryType) => void;
    onToggleStatus: (deliveryType: DeliveryType) => void;
    onViewDetails?: (deliveryType: DeliveryType) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [];
  if (handlers.onViewDetails) {
    actions.push({
      label: "ดูรายละเอียด",
      icon: Eye,
      onSelect: () => handlers.onViewDetails!(deliveryType),
      variant: "default",
    });
  }
  if (canEdit) {
    actions.push({
      label: "แก้ไข",
      icon: Pencil,
      onSelect: () => handlers.onEdit(deliveryType),
      variant: "default",
    });
  }
  if (canDelete) {
    actions.push(
      deliveryType.isActive
        ? { label: "ปิดใช้งาน", icon: Ban, onSelect: () => handlers.onToggleStatus(deliveryType), variant: "danger" }
        : { label: "เปิดใช้งาน", icon: RotateCcw, onSelect: () => handlers.onToggleStatus(deliveryType), variant: "default" }
    );
  }
  return actions;
}

function DeliveryTypeActions({
  deliveryType,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: Omit<DeliveryTypesTableProps, "deliveryTypes" | "meta"> & { deliveryType: DeliveryType }) {
  return (
    <RowActionsMenu
      itemLabel={deliveryType.nameTh}
      actions={getDeliveryTypeRowActions(deliveryType, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails })}
    />
  );
}

export function DeliveryTypesTable({
  deliveryTypes,
  meta,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: DeliveryTypesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (deliveryTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-fg">ไม่พบประเภทการจัดส่ง</p>
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
              <TableHead className="w-[20%]">รหัส</TableHead>
              <TableHead className="w-[28%]">ชื่อ (ไทย)</TableHead>
              <TableHead className="w-[28%]">ชื่อ (อังกฤษ)</TableHead>
              <TableHead className="w-[14%]">สถานะ</TableHead>
              <TableHead className="w-[10%] text-right">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveryTypes.map((deliveryType) => (
              <TableRow key={deliveryType.id}>
                <TableCell className="font-mono text-[13px] tracking-[0.02em] text-fg">
                  {deliveryType.code}
                </TableCell>
                <TableCell className="font-medium text-fg">{deliveryType.nameTh}</TableCell>
                <TableCell className="text-fg-secondary">
                  {deliveryType.nameEn?.trim() || "—"}
                </TableCell>
                <TableCell>
                  <DeliveryTypeStatus deliveryType={deliveryType} />
                </TableCell>
                <TableCell className="text-right">
                  <DeliveryTypeActions
                    deliveryType={deliveryType}
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
