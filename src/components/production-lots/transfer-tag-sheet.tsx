"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { StepTag } from "@/lib/api/production-lots";

export interface TagLabelContext {
  productCode: string;
  productName: string;
  orderCode: string;
  /** Step the work is sent into, e.g. "PS ปั๊ม". */
  toStep: string;
}

/**
 * Transfer-tag labels, one 60×40 mm label per page — same "print the current
 * document, no popup" pattern as package-label-sheet.tsx.
 */
export function TransferTagSheet({
  tags,
  context,
  onDone,
}: {
  tags: StepTag[] | null;
  context: TagLabelContext;
  onDone: () => void;
}) {
  React.useEffect(() => {
    if (!tags?.length) return;
    const after = () => onDone();
    window.addEventListener("afterprint", after);
    const raf = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("afterprint", after);
    };
  }, [tags, onDone]);

  if (!tags?.length) return null;

  return createPortal(
    <div className="hidden print:block">
      <style>{"@page { size: 60mm 40mm; margin: 0; }"}</style>
      {tags.map((tag) => (
        <div
          key={tag.qrCode}
          className="flex h-[40mm] w-[60mm] gap-[2mm] overflow-hidden p-[2mm] text-black [break-after:page] [break-inside:avoid]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL SVG, printed */}
          <img src={tag.qrImage} alt="" className="size-[26mm] shrink-0" />
          <div className="flex min-w-0 flex-col justify-between text-[2.6mm] leading-tight">
            <div>
              <p className="truncate font-bold">{context.productCode}</p>
              <p className="line-clamp-2">{context.productName}</p>
            </div>
            <div>
              <p className="font-bold">ส่งไป {context.toStep}</p>
              <p className="font-mono">{tag.sourceLotNo}</p>
              <p>{tag.qty} ชิ้น</p>
              {tag.origins.length > 0 && (
                <p className="truncate">
                  ต้นทาง{" "}
                  {tag.origins
                    .map((o) => `${o.lotNo}${tag.origins.length > 1 ? `×${o.qty}` : ""}`)
                    .join(", ")}
                </p>
              )}
              <p className="truncate font-mono text-[2.2mm]">{tag.qrCode}</p>
              <p className="text-[2.2mm]">{context.orderCode}</p>
            </div>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
