"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pencil, Ban, RotateCcw, ChevronLeft, ChevronRight, Eye, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import type { Category, PaginatedCategories } from "@/lib/api/categories";
import { cn } from "@/lib/utils";

// Single-view (table-only) renderer for `/master-data/categories`. Categories
// are flat master data with a small footprint (a handful of fields, no
// images, no per-row stock/health numbers), so the page is intentionally
// table-only — no Editorial card / Compact Row variant, unlike Materials PC
// and Products. The same rationale is captured for products: "structurally
// identical but not one generic component" across this app's resources
// (see AGENTS.md § Materials PC).

interface CategoriesTableProps {
  categories: Category[];
  meta: PaginatedCategories["meta"];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (category: Category) => void;
  onToggleStatus: (category: Category) => void;
  onViewDetails: (category: Category) => void;
}

function CategoryStatus({ category }: { category: Category }) {
  return (
    <Badge variant={category.isActive ? "success" : "neutral"} dot>
      {category.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
    </Badge>
  );
}

// `iconColor` is stored as a free-form string (max 20 chars) — see
// cps-api's `UpdateCategoryDto.iconColor`. Treated as a CSS color value
// directly so admins can use any valid CSS color (hex, rgb, named).
// Falls back to a neutral swatch with a "?" placeholder when missing or
// unparseable so the cell never collapses into an empty space.
function IconColorSwatch({ value }: { value: string | null }) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return (
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted"
        aria-label="ไม่ได้ตั้งค่าสี"
        title="ไม่ได้ตั้งค่าสี"
      >
        <Palette className="size-3" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      className="block size-6 shrink-0 rounded-md border border-border"
      style={{ backgroundColor: trimmed }}
      aria-label={`สีไอคอน: ${trimmed}`}
      title={trimmed}
    />
  );
}

// Pure — exported for tests. Same shape as Materials PC's
// getMaterialRowActions: onViewDetails is optional so existing call
// sites/tests that only exercise edit/disable don't need a no-op, and
// "ดูรายละเอียด" is never permission-gated (viewing isn't a mutation).
// Enable/restore is "default" (not "danger") — re-enabling isn't destructive.
export function getCategoryRowActions(
  category: Category,
  canEdit: boolean,
  canDelete: boolean,
  handlers: {
    onEdit: (category: Category) => void;
    onToggleStatus: (category: Category) => void;
    onViewDetails?: (category: Category) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [];
  if (handlers.onViewDetails) {
    actions.push({
      label: "ดูรายละเอียด",
      icon: Eye,
      onSelect: () => handlers.onViewDetails!(category),
      variant: "default",
    });
  }
  if (canEdit) {
    actions.push({
      label: "แก้ไข",
      icon: Pencil,
      onSelect: () => handlers.onEdit(category),
      variant: "default",
    });
  }
  if (canDelete) {
    actions.push(
      category.isActive
        ? { label: "ปิดใช้งาน", icon: Ban, onSelect: () => handlers.onToggleStatus(category), variant: "danger" }
        : { label: "เปิดใช้งาน", icon: RotateCcw, onSelect: () => handlers.onToggleStatus(category), variant: "default" }
    );
  }
  return actions;
}

function CategoryActions({
  category,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: Omit<CategoriesTableProps, "categories" | "meta"> & { category: Category }) {
  return (
    <RowActionsMenu
      itemLabel={category.nameTh}
      actions={getCategoryRowActions(category, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails })}
    />
  );
}

export function CategoriesTable({
  categories,
  meta,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: CategoriesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-fg">ไม่พบหมวดหมู่</p>
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
              <TableHead className="w-[18%]">รหัส</TableHead>
              <TableHead className="w-[24%]">ชื่อ (ไทย)</TableHead>
              <TableHead className="w-[24%]">ชื่อ (อังกฤษ)</TableHead>
              <TableHead className="w-[10%]">ลำดับ</TableHead>
              <TableHead className="w-[8%]">สี</TableHead>
              <TableHead className="w-[10%]">สถานะ</TableHead>
              <TableHead className="w-[6%] text-right">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-mono text-[13px] tracking-[0.02em] text-fg">
                  {category.code}
                </TableCell>
                <TableCell className="font-medium text-fg">{category.nameTh}</TableCell>
                <TableCell className="text-fg-secondary">
                  {category.nameEn?.trim() || "—"}
                </TableCell>
                <TableCell className="text-fg-secondary tabular-nums">
                  {category.sortOrder}
                </TableCell>
                <TableCell>
                  <IconColorSwatch value={category.iconColor} />
                </TableCell>
                <TableCell>
                  <CategoryStatus category={category} />
                </TableCell>
                <TableCell className={cn("text-right")}>
                  <CategoryActions
                    category={category}
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
