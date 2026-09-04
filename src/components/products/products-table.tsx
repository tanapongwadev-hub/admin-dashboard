"use client";

import { useState, type ComponentType } from "react";
import Image from "next/image";
import { Pencil, Ban, RotateCcw, Package, ImageOff, Tag, Warehouse, Users, Layers, Boxes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import { cn, formatNumber } from "@/lib/utils";
import type { ViewMode } from "@/hooks/use-view-mode";
import type { Product } from "@/lib/api/products";

function label(item: { code: string; nameTh?: string; nameEn?: string | null } | null): string {
  if (!item) return "—";
  return item.nameTh || item.nameEn || item.code;
}

function ProductStatus({ product }: { product: Product }) {
  return (
    <Badge variant={product.isActive ? "success" : "neutral"} dot>
      {product.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
    </Badge>
  );
}

// Pure — exported for tests. Enabling a disabled row is "default", not
// "danger" — same reasoning as Materials PC.
export function getProductRowActions(
  product: Product,
  canEdit: boolean,
  canDelete: boolean,
  handlers: { onEdit: (product: Product) => void; onToggleStatus: (product: Product) => void }
): RowAction[] {
  const actions: RowAction[] = [];
  if (canEdit) {
    actions.push({
      label: "แก้ไข",
      icon: Pencil,
      onSelect: () => handlers.onEdit(product),
      variant: "default",
    });
  }
  if (canDelete) {
    actions.push(
      product.isActive
        ? { label: "ปิดใช้งาน", icon: Ban, onSelect: () => handlers.onToggleStatus(product), variant: "danger" }
        : { label: "เปิดใช้งาน", icon: RotateCcw, onSelect: () => handlers.onToggleStatus(product), variant: "default" }
    );
  }
  return actions;
}

function ProductActions({
  product,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
}: {
  product: Product;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
}) {
  return (
    <RowActionsMenu
      itemLabel={product.name}
      actions={getProductRowActions(product, canEdit, canDelete, { onEdit, onToggleStatus })}
    />
  );
}

// Small square product thumbnail for the card header — falls back to a
// plain Package glyph when there's no image or it fails to load. Read-only
// display only; upload stays out of scope (see AGENTS.md § Products).
function ProductCardImage({ product }: { product: Product }) {
  const imagePath = product.productImagePath?.trim() || null;
  const [failed, setFailed] = useState(false);
  const canShow = imagePath !== null && !failed;

  if (!canShow) {
    return (
      <span
        className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg-muted"
        role="img"
        aria-label={`ไม่มีรูปภาพสำหรับ ${product.name}`}
      >
        <ImageOff className="size-5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="relative block size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2">
      <Image
        src={imagePath}
        alt={`Product image: ${product.name}`}
        fill
        sizes="64px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

// One labelled fact inside the card's grouped-info block — same pattern as
// Materials PC's MaterialCardFact, kept as its own local copy rather than a
// shared export: each resource's card fields differ enough that this project
// deliberately hand-writes each table's own card markup instead of factoring
// one generic component (see AGENTS.md § Materials PC "Not (yet) applied to
// Products/Users/Orders").
function ProductCardFact({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-1.5 p-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[11px] leading-none text-fg-muted">{label}</dt>
        <dd className="mt-1 truncate text-xs font-medium text-fg-secondary">{value}</dd>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
}: {
  product: Product;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
}) {
  const unit = product.unit?.nameEn ?? product.unit?.code ?? "";

  return (
    <Card className="flex h-full flex-col divide-y divide-border overflow-hidden transition-shadow duration-200 hover:shadow-md">
      {/* divide-y on the card draws a consistent line between every section
          regardless of which ones render, rather than a fixed border per
          section (which would double up or leave gaps if a section becomes
          conditional later). Image + identity side by side, not a full-width
          photo — products are catalog items identified primarily by
          code/name, the photo is secondary confirmation, not the visual lead
          like Materials PC's card (which shows the physical material
          itself). */}
      <div className="flex gap-3 p-4">
        <ProductCardImage product={product} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs text-fg-muted">{product.code}</p>
          <h2 className="mt-0.5 truncate text-sm font-semibold text-fg" title={product.name}>
            {product.name}
          </h2>
          <div className="mt-2">
            <ProductStatus product={product} />
          </div>
        </div>
      </div>

      {/* Safety/min stock are real production-planning targets on the
          Product entity — not a live stock-on-hand count, which cps-api has
          no tracking for on finished products at all (see AGENTS.md §
          Products). Shown as the card's large primary numbers in place of
          the price/current-stock pair a typical catalog card would lead
          with, since neither exists in the backend. */}
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="px-4 py-3">
          <p className="text-xs text-fg-muted">Safety Stock</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-fg">
            {formatNumber(product.safetyStock)}
            {unit && <span className="ml-1 text-xs font-normal text-fg-muted">{unit}</span>}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-fg-muted">Min Stock</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-fg">
            {formatNumber(product.minStock)}
            {unit && <span className="ml-1 text-xs font-normal text-fg-muted">{unit}</span>}
          </p>
        </div>
      </div>

      <div className="flex-1 p-4">
        {/* Each fact gets its own bordered cell (right border on the left
            column, bottom border on every row but the last) — a divided
            grid like a small table, not just spaced-apart items. */}
        <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-border [&>*]:border-border [&>*:not(:nth-last-child(-n+2))]:border-b [&>*:nth-child(odd)]:border-r">
          <ProductCardFact icon={Tag} label="ประเภทสินค้า" value={label(product.productType)} />
          <ProductCardFact icon={Warehouse} label="สถานที่" value={label(product.location)} />
          <ProductCardFact icon={Users} label="ลูกค้า" value={label(product.customer)} />
          <ProductCardFact icon={Layers} label="รุ่น" value={label(product.model)} />
          <ProductCardFact icon={Package} label="แพ็ก" value={`${formatNumber(product.packing)}${unit ? ` ${unit}` : ""}`} />
          <ProductCardFact icon={Boxes} label="ล็อต" value={formatNumber(product.lotSize)} />
        </dl>
      </div>

      {(canEdit || canDelete) && (
        <div className="flex items-center gap-2 p-3">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-primary/30 text-primary hover:bg-primary-soft"
              onClick={() => onEdit(product)}
            >
              <Pencil className="h-3.5 w-3.5" /> แก้ไข
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex-1",
                product.isActive
                  ? "border-danger/30 text-danger hover:bg-danger-soft"
                  : "border-success/30 text-success hover:bg-success-soft"
              )}
              onClick={() => onToggleStatus(product)}
            >
              {product.isActive ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              {product.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export function ProductsCollection({
  products,
  view,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
}: {
  products: Product[];
  view: ViewMode;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
}) {
  if (view === "card") {
    return (
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="รายการสินค้าแบบการ์ด">
        {products.map((product) => (
          <li key={product.id} className="min-w-0">
            <ProductCard
              product={product}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>รหัส</TableHead>
            <TableHead>สินค้า</TableHead>
            <TableHead>รุ่น</TableHead>
            <TableHead>ลูกค้า</TableHead>
            <TableHead>หน่วย</TableHead>
            <TableHead>แพ็ก / ล็อต</TableHead>
            <TableHead>สต็อกขั้นต่ำ / ปลอดภัย</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="text-right">การจัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium text-fg">{product.code}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg-muted">
                    <Package className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 truncate text-fg-secondary">{product.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-fg-muted">{label(product.model)}</TableCell>
              <TableCell className="text-fg-muted">{label(product.customer)}</TableCell>
              <TableCell className="text-fg-muted">{label(product.unit)}</TableCell>
              <TableCell className="text-fg-muted tabular-nums">
                {product.packing} / {product.lotSize}
              </TableCell>
              <TableCell className="text-fg-muted tabular-nums">
                {product.minStock} / {product.safetyStock}
              </TableCell>
              <TableCell>
                <ProductStatus product={product} />
              </TableCell>
              <TableCell className="text-right">
                <ProductActions
                  product={product}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onToggleStatus={onToggleStatus}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ProductsTable({
  products,
  totalItems,
  view,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
}: {
  products: Product[];
  totalItems: number;
  view: ViewMode;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-fg">ไม่พบสินค้า</p>
        <p className="text-sm text-fg-muted">ลองค้นหาหรือเปลี่ยนตัวกรองสถานะ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ProductsCollection
        products={products}
        view={view}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
      />
      <p className="text-sm text-fg-muted">ทั้งหมด {totalItems} รายการ</p>
    </div>
  );
}
