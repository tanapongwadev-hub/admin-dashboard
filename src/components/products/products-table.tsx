"use client";

import { useState } from "react";
import Image from "next/image";
import { Pencil, Ban, RotateCcw, Package, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import { ProductsImagePreview } from "@/components/products/products-image-preview";
import type { ViewMode } from "@/hooks/use-view-mode";
import type { Product } from "@/lib/api/products";
import { cn, formatNumber } from "@/lib/utils";

// Aligned with Materials PC's design (Table / Editorial card with a Data
// Sheet / Compact Row, essentials inline + a details dialog for the rest) —
// see AGENTS.md § Products for the field-split rationale.

interface ProductsCollectionProps {
  products: Product[];
  view: ViewMode;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
  onViewDetails: (product: Product) => void;
}

type ProductRowProps = Omit<ProductsCollectionProps, "products" | "view"> & {
  product: Product;
  onPreview: (product: Product) => void;
};

function labelOf(item: { code: string; nameTh?: string; nameEn?: string | null } | null): string {
  if (!item) return "—";
  return item.nameTh || item.nameEn || item.code;
}

// Every field on `Product` gets a display label somewhere — the essentials
// (productType, location, customer, model, unit, deliveryType) inline in
// every view, the rest (loadingPoint, processLine, scale, packing, lotSize)
// only in ProductsDetailsDialog's full-record view. Exported/kept as pure
// functions so the dialog and the three inline renderers can't drift.
export function productTypeLabel(product: Product): string {
  return labelOf(product.productType);
}
export function locationLabel(product: Product): string {
  return labelOf(product.location);
}
export function customerLabel(product: Product): string {
  return labelOf(product.customer);
}
export function modelLabel(product: Product): string {
  return labelOf(product.model);
}
export function unitLabel(product: Product): string {
  return labelOf(product.unit);
}
export function deliveryLabel(product: Product): string {
  return labelOf(product.deliveryType);
}
export function loadingPointLabel(product: Product): string {
  return labelOf(product.loadingPoint);
}
export function processLineLabel(product: Product): string {
  return labelOf(product.processLine);
}
export function scaleLabel(product: Product): string {
  return product.scale ?? "—";
}
export function packingLabel(product: Product): string {
  const unit = unitLabel(product);
  return unit !== "—" ? `${formatNumber(product.packing)} ${unit}` : formatNumber(product.packing);
}
export function lotSizeLabel(product: Product): string {
  return formatNumber(product.lotSize);
}

function ProductStatus({ product }: { product: Product }) {
  return (
    <Badge variant={product.isActive ? "success" : "neutral"} dot>
      {product.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
    </Badge>
  );
}

// Pure — exported for tests. Same shape as Materials PC's
// getMaterialRowActions: onViewDetails is optional so existing call
// sites/tests that only exercise edit/disable don't need a no-op, and
// "ดูรายละเอียด" is never permission-gated (viewing isn't a mutation).
export function getProductRowActions(
  product: Product,
  canEdit: boolean,
  canDelete: boolean,
  handlers: {
    onEdit: (product: Product) => void;
    onToggleStatus: (product: Product) => void;
    onViewDetails?: (product: Product) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [];
  if (handlers.onViewDetails) {
    actions.push({
      label: "ดูรายละเอียด",
      icon: Eye,
      onSelect: () => handlers.onViewDetails!(product),
      variant: "default",
    });
  }
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
  onViewDetails,
}: Omit<ProductsCollectionProps, "products" | "view"> & { product: Product }) {
  return (
    <RowActionsMenu
      itemLabel={product.name}
      actions={getProductRowActions(product, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails })}
    />
  );
}

// =====================================================================
// Shared thumbnail (table view). Editorial and List have their own sized
// variants below — see ProductEditorialPhoto / ProductListPhoto. Same
// click-to-preview pattern as Materials PC's MaterialThumbnail.
// =====================================================================
function ProductThumbnail({ product, onPreview }: { product: Product; onPreview: (product: Product) => void }) {
  const imagePath = product.productImagePath?.trim() || null;
  const [failed, setFailed] = useState(false);
  const canShow = imagePath !== null && !failed;

  if (!canShow) {
    return (
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted"
        role="img"
        aria-label={`ไม่มีรูปภาพสำหรับ ${product.name}`}
      >
        <Package className="size-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(product)}
      aria-label={`ดูรูปภาพเต็มของ ${product.name}`}
      className="relative block size-10 shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-border bg-surface-2"
    >
      <Image
        src={imagePath}
        alt={`Product image: ${product.name}`}
        fill
        sizes="40px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </button>
  );
}

// =====================================================================
// EDITORIAL CARD with DATA SHEET (view === "card")
// =====================================================================

function ProductEditorialPhoto({ product, onPreview }: { product: Product; onPreview: (product: Product) => void }) {
  const imagePath = product.productImagePath?.trim() || null;
  const [failed, setFailed] = useState(false);
  const canShow = imagePath !== null && !failed;

  if (!canShow) {
    return (
      <span
        className="flex h-full w-full items-center justify-center rounded-[10px] bg-surface-2 text-fg-muted"
        role="img"
        aria-label={`ไม่มีรูปภาพสำหรับ ${product.name}`}
      >
        <Package className="size-7" aria-hidden="true" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(product)}
      aria-label={`ดูรูปภาพเต็มของ ${product.name}`}
      className="relative block h-full w-full cursor-zoom-in overflow-hidden rounded-[10px] bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Image
        src={imagePath}
        alt={`Product image: ${product.name}`}
        fill
        sizes="(min-width: 640px) 50vw, 100vw"
        className="object-contain p-3"
        onError={() => setFailed(true)}
      />
    </button>
  );
}

// Data Sheet cell — identical shape to Materials PC's DataSheetRow (real
// <table> markup, no truncation, break-words for long values) so the two
// resources' cards read as one family.
function DataSheetRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <th scope="row" className="w-[42%] py-2.5 pl-[18px] pr-3 text-left align-top text-[12.5px] font-normal text-fg-muted">
        {label}
      </th>
      <td className="py-2.5 pr-[18px] text-left align-top text-[13px] font-medium text-fg break-words">{value}</td>
    </tr>
  );
}

function ProductEditorialCard({
  product,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
  onPreview,
}: ProductRowProps) {
  const unit = unitLabel(product);

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-shadow duration-200 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)]"
      role="group"
      aria-label={`บัตรแสดงสินค้า ${product.name}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <div className="absolute inset-3">
          <ProductEditorialPhoto product={product} onPreview={onPreview} />
        </div>
        <div className="absolute right-3.5 top-3.5 z-10">
          <ProductStatus product={product} />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-[18px] pb-1 pt-[18px]">
        <p className="mb-2 font-mono text-[11px] leading-none tracking-[0.05em] text-fg-secondary">{product.code}</p>
        <h2 className="mb-1 truncate text-[17px] font-semibold leading-tight tracking-[-0.01em] text-fg" title={product.name}>
          {product.name}
        </h2>
        <p className="truncate text-[12.5px] leading-tight text-fg-secondary">{productTypeLabel(product)}</p>

        {/* Status is a toggle Switch, not a red/green text button — same
            reasoning and confirm-before-toggle flow as Materials PC. */}
        {canDelete && (
          <label className="mt-2.5 flex w-fit cursor-pointer items-center gap-2">
            <Switch
              checked={product.isActive}
              onCheckedChange={() => onToggleStatus(product)}
              aria-label={product.isActive ? `ปิดใช้งาน ${product.name}` : `เปิดใช้งาน ${product.name}`}
            />
            <span className="text-xs font-medium text-fg-secondary">
              {product.isActive ? "ใช้งานอยู่" : "ไม่ได้ใช้งาน"}
            </span>
          </label>
        )}
      </div>

      {/* Safety/Min Stock — the closest Products equivalent to Materials
          PC's stock hero (no live stock-on-hand tracking exists for
          finished products, see AGENTS.md § Products), shown as two
          production-planning numbers side by side instead of one. */}
      <div className="grid grid-cols-2 divide-x divide-border px-[18px] pb-3.5">
        <div className="min-w-0 pr-3">
          <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-primary">Safety Stock</span>
          <div className="mt-1.5">
            <span className="text-2xl font-bold leading-none tracking-[-0.02em] tabular-nums text-fg">
              {formatNumber(product.safetyStock)}
            </span>
            {unit !== "—" && <span className="ml-1.5 text-xs font-medium text-fg-secondary">{unit}</span>}
          </div>
        </div>
        <div className="min-w-0 pl-3">
          <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-fg-secondary">Min Stock</span>
          <div className="mt-1.5">
            <span className="text-2xl font-bold leading-none tracking-[-0.02em] tabular-nums text-fg">
              {formatNumber(product.minStock)}
            </span>
            {unit !== "—" && <span className="ml-1.5 text-xs font-medium text-fg-secondary">{unit}</span>}
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <table className="w-full text-sm">
          <tbody>
            <DataSheetRow label="ประเภทสินค้า" value={productTypeLabel(product)} />
            <DataSheetRow label="สถานที่" value={locationLabel(product)} />
            <DataSheetRow label="ลูกค้า" value={customerLabel(product)} />
            <DataSheetRow label="รุ่น" value={modelLabel(product)} />
            <DataSheetRow label="หน่วย" value={unitLabel(product)} />
            <DataSheetRow label="ประเภทการจัดส่ง" value={deliveryLabel(product)} />
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 border-t border-border px-[18px] py-3">
        <Button variant="outline" size="sm" className="min-w-0 flex-1 px-2" onClick={() => onViewDetails(product)}>
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">ดูรายละเอียด</span>
        </Button>
        {canEdit && (
          <Button variant="primary" size="sm" className="min-w-0 flex-1 px-2" onClick={() => onEdit(product)}>
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">แก้ไข</span>
          </Button>
        )}
      </div>
    </article>
  );
}

// =====================================================================
// COMPACT LIST ROW (view === "list")
// =====================================================================

function ProductListPhoto({ product, onPreview }: { product: Product; onPreview: (product: Product) => void }) {
  const imagePath = product.productImagePath?.trim() || null;
  const [failed, setFailed] = useState(false);
  const canShow = imagePath !== null && !failed;

  if (!canShow) {
    return (
      <span
        className="flex h-full w-full items-center justify-center bg-surface-2 text-fg-muted"
        role="img"
        aria-label={`ไม่มีรูปภาพสำหรับ ${product.name}`}
      >
        <Package className="size-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(product)}
      aria-label={`ดูรูปภาพเต็มของ ${product.name}`}
      className="relative block h-full w-full cursor-zoom-in overflow-hidden bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
    >
      <Image
        src={imagePath}
        alt={`Product image: ${product.name}`}
        fill
        sizes="56px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </button>
  );
}

function ProductListItem({
  product,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
  onPreview,
}: ProductRowProps) {
  const unit = unitLabel(product);

  return (
    <article
      className={cn(
        "group grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong sm:grid-cols-[56px_1fr_auto] sm:gap-4 sm:px-4 sm:py-3",
        product.isActive ? "border-border" : "border-border opacity-70"
      )}
      role="group"
      aria-label={`รายการสินค้า ${product.name}`}
    >
      <div className="h-11 w-11 overflow-hidden rounded-md border border-border sm:h-14 sm:w-14 sm:rounded-lg">
        <ProductListPhoto product={product} onPreview={onPreview} />
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] leading-none text-fg-muted">{product.code}</span>
          <ProductStatus product={product} />
        </div>
        <h2 className="mb-1 truncate text-sm font-semibold leading-tight text-fg" title={product.name}>
          {product.name}
        </h2>
        <div className="flex items-center gap-2 truncate text-xs leading-tight text-fg-secondary sm:gap-2.5">
          <span className="truncate">{productTypeLabel(product)}</span>
          <span aria-hidden="true" className="text-border-strong">·</span>
          <span className="truncate">{modelLabel(product)}</span>
          <span aria-hidden="true" className="hidden text-border-strong sm:inline">·</span>
          <span className="hidden truncate sm:inline">{customerLabel(product)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="mb-0.5 text-[10px] uppercase leading-none tracking-[0.08em] text-fg-muted">Safety / Min</p>
          <p className="text-sm font-bold leading-none tracking-[-0.01em] tabular-nums text-fg">
            {formatNumber(product.safetyStock)} / {formatNumber(product.minStock)}
            {unit !== "—" && <span className="ml-1 text-[11px] font-medium text-fg-muted">{unit}</span>}
          </p>
        </div>
        <RowActionsMenu
          itemLabel={product.name}
          actions={getProductRowActions(product, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails })}
        />
      </div>
    </article>
  );
}

// =====================================================================
// COLLECTION — switches between table / card / list. See AGENTS.md §
// Products for how this mirrors Materials PC's Editorial + Compact combo.
// =====================================================================
export function ProductsCollection({
  products,
  view,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: ProductsCollectionProps) {
  const [previewTarget, setPreviewTarget] = useState<Product | null>(null);

  const commonProps = {
    canEdit,
    canDelete,
    onEdit,
    onToggleStatus,
    onViewDetails,
    onPreview: setPreviewTarget,
  };

  return (
    <div className="@container">
      {view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <span className="sr-only">รูปภาพ</span>
                </TableHead>
                <TableHead>รหัส</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead>รุ่น</TableHead>
                <TableHead>ลูกค้า</TableHead>
                <TableHead>หน่วย</TableHead>
                <TableHead>สต็อกขั้นต่ำ / ปลอดภัย</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <ProductThumbnail product={product} onPreview={setPreviewTarget} />
                  </TableCell>
                  <TableCell className="font-medium text-fg">{product.code}</TableCell>
                  <TableCell className="text-fg-secondary">{product.name}</TableCell>
                  <TableCell className="text-fg-muted">{modelLabel(product)}</TableCell>
                  <TableCell className="text-fg-muted">{customerLabel(product)}</TableCell>
                  <TableCell className="text-fg-muted">{unitLabel(product)}</TableCell>
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
                      onViewDetails={onViewDetails}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : view === "list" ? (
        <ul className="flex flex-col gap-2" aria-label="รายการสินค้าแบบแถว">
          {products.map((product) => (
            <li key={product.id}>
              <ProductListItem product={product} {...commonProps} />
            </li>
          ))}
        </ul>
      ) : (
        <ul
          className="grid grid-cols-1 gap-3 @min-[40rem]:grid-cols-2 @min-[80rem]:grid-cols-4"
          aria-label="รายการสินค้าแบบการ์ด"
        >
          {products.map((product) => (
            <li key={product.id} className="min-w-0">
              <ProductEditorialCard product={product} {...commonProps} />
            </li>
          ))}
        </ul>
      )}

      <ProductsImagePreview product={previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)} />
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
  onViewDetails,
}: {
  products: Product[];
  totalItems: number;
  view: ViewMode;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
  onViewDetails: (product: Product) => void;
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
        onViewDetails={onViewDetails}
      />
      <p className="text-sm text-fg-muted">ทั้งหมด {totalItems} รายการ</p>
    </div>
  );
}
