"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import type { Product } from "@/lib/api/products";
import {
  productTypeLabel,
  locationLabel,
  customerLabel,
  modelLabel,
  unitLabel,
  deliveryLabel,
  loadingPointLabel,
  processLineLabel,
  scaleLabel,
  packingLabel,
  lotSizeLabel,
} from "@/components/products/products-table";

// Mirrors material-pc-details-dialog.tsx's Hero + Data Sheet pattern exactly
// (same DataSheetRow/SectionLabel shape, same layout rhythm) so moving
// between the two resources' "view full record" dialogs feels identical.
function DataSheetRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <th scope="row" className="w-[36%] py-2.5 pl-5 pr-3 text-left align-top text-[12.5px] font-normal text-fg-muted">
        {label}
      </th>
      <td className="py-2.5 pr-5 text-left align-top text-[13px] font-medium text-fg break-words">{value}</td>
    </tr>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">{children}</h3>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

// Inner view — extracted so SSR tests can render it directly (Radix Dialog's
// Portal doesn't appear in renderToStaticMarkup output; see AGENTS.md §
// Row actions for the same limitation and how existing tests handle it).
export function ProductsDetailsView({
  product,
  canEdit = false,
  onEdit,
  onClose,
}: {
  product: Product;
  canEdit?: boolean;
  onEdit?: (product: Product) => void;
  onClose: () => void;
}) {
  const imagePath = product.productImagePath?.trim() || null;
  const unit = unitLabel(product);

  function handleEdit() {
    if (!onEdit) return;
    onEdit(product);
    onClose();
  }

  return (
    <div>
      {/* HERO SECTION — image (left) + identity (right), same 320×240 4:3
          frame as Materials PC's dialog. Read-only display here (edit-mode
          image replacement lives in ProductsFormDialog, see
          products-form-dialog.tsx#ProductImagePicker) — no lightbox in this
          particular dialog, unlike the table/card thumbnails which open
          ProductsImagePreview. */}
      <header className="border-b border-border px-6 py-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2 sm:h-[240px] sm:w-[320px]">
            {imagePath ? (
              <Image
                src={imagePath}
                alt={`Product image: ${product.name}`}
                fill
                sizes="(min-width: 640px) 320px, 100vw"
                className="object-contain p-3"
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-fg-muted"
                role="img"
                aria-label={`ไม่มีรูปภาพสำหรับ ${product.name}`}
              >
                <Package className="size-10" aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
            <p className="font-mono text-xs tracking-[0.05em] text-fg-muted">{product.code}</p>
            <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-fg">{product.name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={product.isActive ? "success" : "neutral"} dot>
                {product.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
              </Badge>
              <Badge variant="neutral">{productTypeLabel(product)}</Badge>
            </div>

            {/* Safety/min stock in the hero — same spot Materials PC's stock
                number sits in, since these are the closest equivalent
                "headline numbers" Products has (no live stock-on-hand
                tracking exists for finished products — see AGENTS.md §
                Products). */}
            <div className="mt-2 flex flex-wrap items-center gap-5 border-t border-border pt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">Safety Stock</span>
                <span className="text-2xl font-bold leading-none tabular-nums tracking-[-0.02em] text-fg">
                  {formatNumber(product.safetyStock)}
                </span>
                {unit !== "—" && <span className="text-sm font-medium text-fg-muted">{unit}</span>}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">Min Stock</span>
                <span className="text-2xl font-bold leading-none tabular-nums tracking-[-0.02em] text-fg">
                  {formatNumber(product.minStock)}
                </span>
                {unit !== "—" && <span className="text-sm font-medium text-fg-muted">{unit}</span>}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* DATA SHEET SECTION — every field, not just the card's 6 essentials
          (ประเภทสินค้า/สถานที่/ลูกค้า/รุ่น/หน่วย/ประเภทการจัดส่ง already shown
          inline on the card) — this dialog is where จุดขึ้นสินค้า/สายการผลิต/
          มาตราส่วน/แพ็ก/ล็อต actually get to be seen at all, since Products
          has no prose fields the way Materials has specification/description
          to fill the rest of this dialog with. */}
      <section className="px-6 py-5">
        <SectionLabel>ข้อมูลจำเพาะ</SectionLabel>
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <tbody>
              <DataSheetRow label="ประเภทสินค้า" value={productTypeLabel(product)} />
              <DataSheetRow label="สถานที่" value={locationLabel(product)} />
              <DataSheetRow label="ลูกค้า" value={customerLabel(product)} />
              <DataSheetRow label="รุ่น" value={modelLabel(product)} />
              <DataSheetRow label="หน่วย" value={unitLabel(product)} />
              <DataSheetRow label="ประเภทการจัดส่ง" value={deliveryLabel(product)} />
              <DataSheetRow label="จุดขึ้นสินค้า" value={loadingPointLabel(product)} />
              <DataSheetRow label="สายการผลิต" value={processLineLabel(product)} />
              <DataSheetRow label="มาตราส่วน" value={scaleLabel(product)} />
              <DataSheetRow label="แพ็ก" value={packingLabel(product)} />
              <DataSheetRow label="ล็อต" value={lotSizeLabel(product)} />
            </tbody>
          </table>
        </div>
      </section>

      <section className="px-6 pb-5">
        <p className="text-xs text-fg-muted">
          เพิ่มเมื่อ <span className="text-fg-secondary">{formatDateTime(product.createdAt)}</span>
          <span className="mx-2 text-border-strong">·</span>
          แก้ไขล่าสุด <span className="text-fg-secondary">{formatDateTime(product.updatedAt)}</span>
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

export function ProductsDetailsDialog({
  product,
  canEdit = false,
  onEdit,
  onOpenChange,
}: {
  product: Product | null;
  canEdit?: boolean;
  onEdit?: (product: Product) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!product) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="p-0">
        <ProductsDetailsView product={product} canEdit={canEdit} onEdit={onEdit} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
