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
import type { Material } from "@/lib/api/materials";

function fileNameFor(material: Material) {
  const ext = material.imagePath?.split(".").pop() || "jpg";
  return `${material.code}.${ext}`;
}

export function MaterialPcImagePreview({
  material,
  onOpenChange,
}: {
  material: Material | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!material || !material.imagePath) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="lg" className="p-0">
        <DialogHeader>
          <DialogTitle>{material.name}</DialogTitle>
          <DialogDescription>{material.code}</DialogDescription>
        </DialogHeader>

        <div className="relative min-h-64 max-h-[70vh] flex-1 bg-surface-2">
          {/* absolute inset (not h-full/w-full) — a percentage height on a flex
              item inside this auto-height flex column isn't "definite" per the
              CSS spec, so h-full collapses to 0 even though the parent has a
              real pixel height. inset-4 positions against the parent's already
              laid-out box instead, which isn't subject to that rule. */}
          <div className="absolute inset-4">
            <Image
              src={material.imagePath}
              alt={`Material image: ${material.name}`}
              fill
              sizes="(max-width: 40rem) 100vw, 40rem"
              className="object-contain"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button asChild variant="outline">
            {/* Same-origin (rewritten in next.config.ts), so `download` triggers a real browser save. */}
            <a href={material.imagePath} download={fileNameFor(material)}>
              <Download className="h-4 w-4" /> ดาวน์โหลด
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
