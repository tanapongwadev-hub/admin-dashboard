"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pencil, Ban, RotateCcw, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import type { RejectReason, PaginatedRejectReasons } from "@/lib/api/reject-reasons";

// Single-view (table-only) renderer for `/master-data/reject-reasons`.
// Reject reasons are flat master data with a small footprint (4 fields,
// no images, no per-row stock/health numbers), so the page is intentionally
// table-only — no Editorial card / Compact Row variant, mirroring the
// same design decision the Categories / Loading Points / Delivery Types
// pages made for the same reason (see AGENTS.md § Categories and
// § Loading Points). The shared `useViewMode`/`ViewToggle` primitives
// are ready to reuse if a real need shows up.

interface RejectReasonsTableProps {
  rejectReasons: RejectReason[];
  meta: PaginatedRejectReasons["meta"];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (rejectReason: RejectReason) => void;
  onToggleStatus: (rejectReason: RejectReason) => void;
  onViewDetails: (rejectReason: RejectReason) => void;
}

function RejectReasonStatus({ rejectReason }: { rejectReason: RejectReason }) {
  return (
    <Badge variant={rejectReason.isActive ? "success" : "neutral"} dot>
      {rejectReason.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
    </Badge>
  );
}

// Pure — exported for tests. Same shape as Materials PC's
// getMaterialRowActions: onViewDetails is optional so existing call
// sites/tests that only exercise edit/disable don't need a no-op, and
// "ดูรายละเอียด" is never permission-gated (viewing isn't a mutation).
// Enable/restore is "default" (not "danger") — re-enabling isn't destructive.
export function getRejectReasonRowActions(
  rejectReason: RejectReason,
  canEdit: boolean,
  canDelete: boolean,
  handlers: {
    onEdit: (rejectReason: RejectReason) => void;
    onToggleStatus: (rejectReason: RejectReason) => void;
    onViewDetails?: (rejectReason: RejectReason) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [];
  if (handlers.onViewDetails) {
    actions.push({
      label: "ดูรายละเอียด",
      icon: Eye,
      onSelect: () => handlers.onViewDetails!(rejectReason),
      variant: "default",
    });
  }
  if (canEdit) {
    actions.push({
      label: "แก้ไข",
      icon: Pencil,
      onSelect: () => handlers.onEdit(rejectReason),
      variant: "default",
    });
  }
  if (canDelete) {
    actions.push(
      rejectReason.isActive
        ? { label: "ปิดใช้งาน", icon: Ban, onSelect: () => handlers.onToggleStatus(rejectReason), variant: "danger" }
        : { label: "เปิดใช้งาน", icon: RotateCcw, onSelect: () => handlers.onToggleStatus(rejectReason), variant: "default" }
    );
  }
  return actions;
}

function RejectReasonActions({
  rejectReason,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: Omit<RejectReasonsTableProps, "rejectReasons" | "meta"> & { rejectReason: RejectReason }) {
  return (
    <RowActionsMenu
      itemLabel={rejectReason.nameTh}
      actions={getRejectReasonRowActions(rejectReason, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails })}
    />
  );
}

export function RejectReasonsTable({
  rejectReasons,
  meta,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: RejectReasonsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (rejectReasons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-fg">ไม่พบเหตุผลการปฏิเสธ</p>
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
            {rejectReasons.map((rejectReason) => (
              <TableRow key={rejectReason.id}>
                <TableCell className="font-mono text-[13px] tracking-[0.02em] text-fg">
                  {rejectReason.code}
                </TableCell>
                <TableCell className="font-medium text-fg">{rejectReason.nameTh}</TableCell>
                <TableCell className="text-fg-secondary">
                  {rejectReason.nameEn?.trim() || "—"}
                </TableCell>
                <TableCell>
                  <RejectReasonStatus rejectReason={rejectReason} />
                </TableCell>
                <TableCell className="text-right">
                  <RejectReasonActions
                    rejectReason={rejectReason}
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
