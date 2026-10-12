"use client";

import { useState } from "react";
import Image from "next/image";
import { Pencil, Ban, RotateCcw, Package, Eye, Boxes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import { ProductsImagePreview } from "@/components/products/products-image-preview";
import { ProductStockBalance, formatProductQuantity } from "./product-stock-balance";
import type { ViewMode } from "@/hooks/use-view-mode";
import type { Product } from "@/lib/api/products";
import { cn, formatNumber } from "@/lib/utils";

// Aligned with Materials PC's current design (bounded sticky table /
// compact Editorial card with a three-field meta strip / Compact Row,
// with the full record in a details dialog) — see AGENTS.md § Products.

interface ProductsCollectionProps {
  products: Product[];
  stockByProductId?: Record<string, string>;
  onViewStock?: (product: Product) => void;
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
    onViewStock?: (product: Product) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [];
  if (handlers.onViewStock) {
    actions.push({ label: "สต็อก / รับเข้า–จ่ายออก", icon: Boxes, onSelect: () => handlers.onViewStock!(product), variant: "default" });
  }
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
  onViewStock,
}: Omit<ProductsCollectionProps, "products" | "view"> & { product: Product }) {
  return (
    <RowActionsMenu
      itemLabel={product.name}
      actions={getProductRowActions(product, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails, onViewStock })}
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
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const canShow = imagePath !== null && failedPath !== imagePath;

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
        onError={() => setFailedPath(imagePath)}
      />
    </button>
  );
}

// =====================================================================
// COMPACT EDITORIAL CARD (view === "card")
// =====================================================================

function ProductEditorialPhoto({ product, onPreview }: { product: Product; onPreview: (product: Product) => void }) {
  const imagePath = product.productImagePath?.trim() || null;
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const canShow = imagePath !== null && failedPath !== imagePath;

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
        sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-contain p-3"
        onError={() => setFailedPath(imagePath)}
      />
    </button>
  );
}

// Three-column summary strip — same compact shape as Materials PC's current
// Editorial card. Detailed fields remain available in the details dialog.
function CardMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-border px-3 py-2.5 last:border-r-0">
      <p className="mb-1 text-[10px] text-fg-muted">{label}</p>
      <p className="truncate font-medium text-fg-secondary" title={value}>{value}</p>
    </div>
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
  stockByProductId,
  onViewStock,
}: ProductRowProps) {
  const unit = unitLabel(product);

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface shadow-sm transition-colors hover:border-border-strong"
      role="group"
      aria-label={`บัตรแสดงสินค้า ${product.name}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
        <div className="absolute inset-2.5">
          <ProductEditorialPhoto product={product} onPreview={onPreview} />
        </div>
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          <ProductStatus product={product} />
          <RowActionsMenu
            itemLabel={product.name}
            actions={getProductRowActions(product, canEdit, canDelete, { onEdit, onToggleStatus })}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
        <p className="mb-1.5 font-mono text-[11px] leading-none tracking-[0.05em] text-primary">{product.code}</p>
        <h2 className="mb-1 truncate text-base font-semibold leading-tight text-fg" title={product.name}>
          {product.name}
        </h2>
        <p className="truncate text-xs leading-tight text-fg-secondary" title={productTypeLabel(product)}>{productTypeLabel(product)}</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-fg-muted">ลูกค้า</dt>
          <dd className="min-w-0 truncate text-fg-secondary" title={customerLabel(product)}>{customerLabel(product)}</dd>
          <dt className="text-fg-muted">รุ่น</dt>
          <dd className="min-w-0 truncate text-fg-secondary" title={modelLabel(product)}>{modelLabel(product)}</dd>
        </dl>
      </div>

      <div className="px-4 pb-4"><ProductStockBalance product={product} quantity={stockByProductId ? stockByProductId[product.id] ?? "0" : undefined} /></div>

      <div className="grid grid-cols-2 divide-x divide-border px-4 pb-3">
        <div className="min-w-0 pr-3">
          <span className="text-[10px] leading-none text-fg-muted">จำนวนบรรจุ</span>
          <div className="mt-1.5">
            <span className="text-sm font-medium tabular-nums text-fg-secondary">
              {formatNumber(product.packing)}
            </span>
            {unit !== "—" && <span className="ml-1.5 text-xs font-medium text-fg-secondary">{unit}</span>}
          </div>
        </div>
        <div className="min-w-0 pl-3">
          <span className="text-[10px] leading-none text-fg-muted">ล็อตผลิต</span>
          <div className="mt-1.5">
            <span className="text-sm font-medium tabular-nums text-fg-secondary">
              {formatNumber(product.lotSize)}
            </span>
            {unit !== "—" && <span className="ml-1.5 text-xs font-medium text-fg-secondary">{unit}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-border bg-surface-2/40 text-xs">
        <CardMeta label="เกณฑ์ขั้นต่ำ" value={`${formatNumber(product.minStock)} ${unit !== "—" ? unit : ""}`.trim()} />
        <CardMeta label="เกณฑ์ Safety Stock" value={`${formatNumber(product.safetyStock)} ${unit !== "—" ? unit : ""}`.trim()} />
        <CardMeta label="สายการผลิต" value={processLineLabel(product)} />
      </div>

      <div className="flex gap-2 border-t border-border px-4 py-3">
        {onViewStock ? (
          <Button variant="primary" size="sm" className="min-w-0 flex-1 px-2" onClick={() => onViewStock(product)}>
            <Boxes className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 truncate">สต็อกสินค้า</span>
          </Button>
        ) : canEdit && (
          <Button variant="primary" size="sm" className="min-w-0 flex-1 px-2" onClick={() => onEdit(product)}>
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">แก้ไข</span>
          </Button>
        )}
        <Button variant="secondary" size="sm" className="min-w-0 flex-1 px-2" onClick={() => onViewDetails(product)}>
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">รายละเอียด</span>
        </Button>
      </div>
    </article>
  );
}

// =====================================================================
// COMPACT LIST ROW (view === "list")
// =====================================================================

function ProductListPhoto({ product, onPreview }: { product: Product; onPreview: (product: Product) => void }) {
  const imagePath = product.productImagePath?.trim() || null;
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const canShow = imagePath !== null && failedPath !== imagePath;

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
        onError={() => setFailedPath(imagePath)}
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
  stockByProductId,
  onViewStock,
}: ProductRowProps) {
  const unit = unitLabel(product);

  return (
    <article
      className={cn(
        "group grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong @min-[36rem]:grid-cols-[56px_minmax(0,1fr)_auto] @min-[36rem]:gap-4 @min-[36rem]:px-4 @min-[36rem]:py-3",
        product.isActive ? "border-border" : "border-border opacity-70"
      )}
      role="group"
      aria-label={`รายการสินค้า ${product.name}`}
    >
      <div className="h-11 w-11 overflow-hidden rounded-md border border-border @min-[36rem]:h-14 @min-[36rem]:w-14">
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
        <p className="mt-1.5 text-xs text-fg-secondary @min-[36rem]:hidden">คงเหลือ <span className="font-semibold tabular-nums text-fg">{stockByProductId ? formatProductQuantity(stockByProductId[product.id] ?? "0") : "—"}</span> {unit !== "—" ? unit : ""}</p>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden text-right @min-[36rem]:block">
          <p className="mb-0.5 text-[10px] leading-none text-fg-muted">สินค้าคงเหลือ</p>
          <p className="text-sm font-bold leading-none tracking-[-0.01em] tabular-nums text-fg">
            {stockByProductId ? formatProductQuantity(stockByProductId[product.id] ?? "0") : "—"}
            {unit !== "—" && <span className="ml-1 text-[11px] font-medium text-fg-muted">{unit}</span>}
          </p>
        </div>
        <RowActionsMenu
          itemLabel={product.name}
          actions={getProductRowActions(product, canEdit, canDelete, { onEdit, onToggleStatus, onViewDetails, onViewStock })}
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
  stockByProductId,
  onViewStock,
  view,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: ProductsCollectionProps) {
  const [previewTarget, setPreviewTarget] = useState<Product | null>(null);

  const commonProps = {
    stockByProductId,
    onViewStock,
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
        <div className="max-h-[68vh] overflow-auto rounded-md border border-border bg-surface">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-surface shadow-[0_1px_0_0_var(--border)]">
              <TableRow>
                <TableHead>
                  <span className="sr-only">รูปภาพ</span>
                </TableHead>
                <TableHead>รหัส</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead>รุ่น</TableHead>
                <TableHead>ลูกค้า</TableHead>
                <TableHead>หน่วย</TableHead>
                <TableHead className="text-right">สินค้าคงเหลือ</TableHead>
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
                  <TableCell>
                    <button type="button" onClick={() => onViewDetails(product)} className="rounded-sm text-left font-medium text-fg hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      {product.name}
                    </button>
                    <p className="mt-0.5 text-xs text-fg-muted">{productTypeLabel(product)}</p>
                  </TableCell>
                  <TableCell className="text-fg-muted">{modelLabel(product)}</TableCell>
                  <TableCell className="text-fg-muted">{customerLabel(product)}</TableCell>
                  <TableCell className="text-fg-muted">{unitLabel(product)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-fg">
                    <button type="button" disabled={!onViewStock} onClick={() => onViewStock?.(product)} className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`ดูสต็อกสินค้า ${product.name}`}>
                      {stockByProductId ? formatProductQuantity(stockByProductId[product.id] ?? "0") : "—"}
                    </button>
                  </TableCell>
                  <TableCell className="text-fg-muted tabular-nums">
                    {formatNumber(product.minStock)} / {formatNumber(product.safetyStock)}
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
                      onViewStock={onViewStock}
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
          className="grid grid-cols-1 gap-3 @min-[36rem]:grid-cols-2 @min-[60rem]:grid-cols-3 @min-[82rem]:grid-cols-4 @min-[100rem]:grid-cols-5"
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
  stockByProductId,
  onViewStock,
  totalItems,
  view,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
}: {
  products: Product[];
  stockByProductId?: Record<string, string>;
  onViewStock?: (product: Product) => void;
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
      <div className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-surface px-4 py-16 text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-md bg-primary-soft text-primary"><Package className="size-6" aria-hidden="true" /></span>
        <p className="text-sm font-medium text-fg">ไม่พบสินค้า</p>
        <p className="text-sm text-fg-muted">ลองเปลี่ยนคำค้นหาหรือตัวกรองสินค้า</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ProductsCollection
        products={products}
        stockByProductId={stockByProductId}
        onViewStock={onViewStock}
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
