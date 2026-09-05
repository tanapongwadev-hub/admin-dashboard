"use client";

import Image from "next/image";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/api/products";

// Mirrors material-pc-image-preview.tsx exactly — same shared Dialog +
// Download-via-same-origin-rewrite pattern (see AGENTS.md § Materials PC),
// applied to Products so both resources browse/preview photos identically.
function fileNameFor(product: Product) {
  const ext = product.productImagePath?.split(".").pop() || "jpg";
  return `${product.code}.${ext}`;
}

export function ProductsImagePreview({
  product,
  onOpenChange,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!product || !product.productImagePath) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="lg" className="p-0">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>{product.code}</DialogDescription>
        </DialogHeader>

        <div className="relative min-h-64 max-h-[70vh] flex-1 bg-surface-2">
          <div className="absolute inset-4">
            <Image
              src={product.productImagePath}
              alt={`Product image: ${product.name}`}
              fill
              sizes="(max-width: 40rem) 100vw, 40rem"
              className="object-contain"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button asChild variant="outline">
            <a href={product.productImagePath} download={fileNameFor(product)}>
              <Download className="h-4 w-4" /> ดาวน์โหลด
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
