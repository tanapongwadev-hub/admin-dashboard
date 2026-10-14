"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { StepTag } from "@/lib/api/production-lots";
import { ProductionQrLabel, ProductionQrPrintLayout } from "./production-qr-print-layout";

export interface TagLabelContext {
  productCode: string;
  productName: string;
  orderCode: string;
  /** Step the work is sent into, e.g. "PS ปั๊ม". */
  toStep: string;
}

/**
 * Transfer-tag labels, eight labels per A4 page — same "print the current
 * document, no popup" pattern as package-label-sheet.tsx.
 */
export function TransferTagSheet({
  tags,
  context,
  onDone,
  remainingOnly = false,
}: {
  tags: StepTag[] | null;
  context: TagLabelContext;
  onDone: () => void;
  /** Reprint outstanding WIP with its current remaining quantity. */
  remainingOnly?: boolean;
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
    <ProductionQrPrintLayout
      title={`${remainingOnly ? "ป้ายงานค้างในกระบวนการ" : "QR ส่งต่อ"} · ${context.orderCode}`}
      labels={tags.map((tag) => (
        <ProductionQrLabel
          key={tag.qrCode}
          qrImage={tag.qrImage}
          qrCode={tag.qrCode}
          productCode={context.productCode}
          productName={context.productName}
          orderCode={context.orderCode}
          quantity={remainingOnly || tag.revision > 0 ? tag.left : tag.qty}
          fields={[
            { label: remainingOnly ? "กระบวนการปัจจุบัน" : "ส่งไปขั้นตอน", value: context.toStep },
            { label: "Lot ต้นทาง", value: tag.sourceLotNo },
            { label: "กล่อง", value: `${tag.boxNo}/${tag.boxCount}${tag.revision > 0 ? ` · แบ่งจาก ${tag.qty} ชิ้น` : ""}` },
          ]}
        />
      ))}
    />,
    document.body,
  );
}
