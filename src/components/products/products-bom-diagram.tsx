"use client";

import * as React from "react";
import Image from "next/image";
import { Waypoints, Package, ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import type { Product } from "@/lib/api/products";
import type { BomItem } from "@/lib/api/boms";
import type { Material } from "@/lib/api/materials";

// A node-and-line "component diagram" for one BOM's material list, opened
// on demand from products-details-dialog.tsx's BOM tab (see AGENTS.md §
// Products). No charting/graph library — this is a fixed radial layout
// (the product node at center, one material node per BOM item evenly
// spaced around a circle), computed as plain percentages so an SVG line
// layer and the HTML image nodes can share the same coordinate space
// (both measured against the same square container).
// The old 38% ring put a top node's centre at just 12% of the square. Once
// its icon and two text lines were included, that node crossed the dialog's
// top edge on narrow phones. These values reserve an 18% outer safe zone
// while keeping a clear gap between the centre product and each component.
const CENTER_SIZE = 80;
const NODE_SIZE = 60;
const RADIUS_PERCENT = 32;

function useRadialPositions(count: number): { x: number; y: number }[] {
  return React.useMemo(() => {
    if (count === 0) return [];
    return Array.from({ length: count }, (_, i) => {
      // Start at the top (-90deg) and go clockwise so the first item reads
      // naturally at 12 o'clock instead of 3 o'clock.
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      return {
        x: 50 + RADIUS_PERCENT * Math.cos(angle),
        y: 50 + RADIUS_PERCENT * Math.sin(angle),
      };
    });
  }, [count]);
}

function DiagramNode({
  imagePath,
  alt,
  label,
  sublabel,
  size,
  x,
  y,
  center = false,
}: {
  imagePath: string | null;
  alt: string;
  label: string;
  sublabel?: string;
  size: number;
  x: number;
  y: number;
  center?: boolean;
}) {
  return (
    <div
      className="absolute flex flex-col items-center gap-1.5"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", width: size + 48 }}
    >
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-surface-2",
          center ? "border-primary shadow-[0_0_0_4px_var(--primary-soft)]" : "border-border-strong shadow-sm"
        )}
        style={{ width: size, height: size }}
      >
        {imagePath ? (
          <Image src={imagePath} alt={alt} fill sizes={`${size}px`} className="object-cover" />
        ) : center ? (
          <Package className="size-7 text-primary" aria-hidden="true" />
        ) : (
          <ImageOff className="size-5 text-fg-muted" aria-hidden="true" />
        )}
      </span>
      <div className="max-w-[7rem] text-center">
        <p className={cn("truncate text-xs font-semibold", center ? "text-primary" : "text-fg")} title={label}>
          {label}
        </p>
        {sublabel && (
          <p className="truncate text-[10.5px] text-fg-muted" title={sublabel}>
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProductBomDiagram({
  product,
  items,
  materials,
}: {
  product: Product;
  items: BomItem[];
  materials: Material[];
}) {
  const [open, setOpen] = React.useState(false);
  const positions = useRadialPositions(items.length);

  // BomItem carries materialCode/materialName but not the image — cross
  // referenced here against the same `materials` list the wizard's BOM
  // item picker already uses (see AGENTS.md § Products), matched by id.
  function materialImage(materialId: string): string | null {
    return materials.find((m) => m.id === materialId)?.imagePath?.trim() || null;
  }

  return (
    <>
      {/* Accent-tinted chip, not a plain outline button — this trigger sits
          directly on the BOM version header's bg-surface-2 strip
          (products-details-dialog.tsx), where a transparent-background
          outline button has nothing to contrast against and disappears
          into the strip (same anti-pattern documented in AGENTS.md §
          Material Receiving's button-contrast fix). The primary-soft tint
          also reads as "open a visual," distinct from the plain-text item
          count next to it. */}
      <Button
        variant="outline"
        size="sm"
        className="border-primary/25 bg-primary-soft text-primary hover:border-primary/40 hover:bg-primary/15 hover:text-primary"
        onClick={() => setOpen(true)}
      >
        <Waypoints className="h-3.5 w-3.5" aria-hidden="true" /> แผนภาพองค์ประกอบ
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent fullScreenOnMobile size="xl">
          <DialogHeader>
            <DialogTitle>แผนภาพองค์ประกอบ — {product.name}</DialogTitle>
            <DialogDescription>
              เส้นเชื่อมแสดงวัตถุดิบที่ใช้ประกอบสินค้านี้ ({items.length} รายการ)
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            {items.length === 0 ? (
              <p className="py-10 text-center text-sm text-fg-muted">ยังไม่มีรายการวัตถุดิบใน BOM นี้</p>
            ) : (
              <div className="relative mx-auto aspect-square w-full max-w-lg">
                {/* Lines drawn first (z-order), nodes on top. viewBox is a
                    plain 0-100 square matching the percentage coordinates
                    used for the HTML nodes below — the container is forced
                    aspect-square so the two coordinate systems line up
                    regardless of the dialog's actual rendered width. */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
                  {positions.map((pos, i) => (
                    <line
                      key={items[i].id}
                      x1={50}
                      y1={50}
                      x2={pos.x}
                      y2={pos.y}
                      stroke="var(--border-strong)"
                      strokeWidth={0.6}
                    />
                  ))}
                </svg>

                <DiagramNode
                  center
                  imagePath={product.productImagePath?.trim() || null}
                  alt={`Product image: ${product.name}`}
                  label={product.name}
                  sublabel={product.code}
                  size={CENTER_SIZE}
                  x={50}
                  y={50}
                />

                {items.map((item, i) => (
                  <DiagramNode
                    key={item.id}
                    imagePath={materialImage(item.materialId)}
                    alt={`Material image: ${item.materialName}`}
                    label={item.materialName}
                    sublabel={`${formatNumber(item.quantity)} ${item.unitNameTh}`}
                    size={NODE_SIZE}
                    x={positions[i].x}
                    y={positions[i].y}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
