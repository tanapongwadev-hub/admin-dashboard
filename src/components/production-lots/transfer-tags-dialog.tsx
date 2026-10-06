"use client";

import { Loader2, Printer, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { listStepTagsAction } from "@/app/(dashboard)/products/process-orders/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StepTag } from "@/lib/api/production-lots";
import {
  TransferTagSheet,
  type TagLabelContext,
} from "./transfer-tag-sheet";

/**
 * Transfer tags (QR) of the work sent into one step: shown right after a
 * transfer (`initialTags` from the transfer result) or loaded for reprint
 * (`lineId` + `stepIndex`). Print one tag or all. Remounted per open.
 */
export function TransferTagsDialog({
  lineId,
  stepIndex,
  title,
  context,
  initialTags,
  onClose,
}: {
  lineId: string;
  /** Step the work was sent INTO. */
  stepIndex: number;
  title: string;
  context: TagLabelContext;
  initialTags?: StepTag[];
  onClose: () => void;
}) {
  const [tags, setTags] = useState<StepTag[] | null>(initialTags ?? null);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState<StepTag[] | null>(null);

  useEffect(() => {
    if (initialTags) return;
    let alive = true;
    listStepTagsAction(lineId, stepIndex).then((r) => {
      if (!alive) return;
      if (r.status === "success") setTags(r.tags);
      else setError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [lineId, stepIndex, initialTags]);

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="size-5" aria-hidden /> {title}
            </DialogTitle>
            <DialogDescription>
              พิมพ์ QR แล้วติดที่งานที่ส่งไปขั้นตอนถัดไป — สแกนเพื่อดูว่างานชุดนี้อยู่ขั้นตอนไหน
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            {!tags && !error && (
              <p className="flex items-center justify-center gap-2 py-8 text-sm text-fg-muted">
                <Loader2 className="size-4 animate-spin" /> กำลังโหลด…
              </p>
            )}
            {error && (
              <p role="alert" className="py-4 text-sm text-danger">
                {error}
              </p>
            )}
            {tags && tags.length === 0 && (
              <p className="py-8 text-center text-sm text-fg-muted">
                ยังไม่มี QR ส่งต่อที่ขั้นตอนนี้
              </p>
            )}
            {tags && tags.length > 0 && (
              <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tags.map((tag) => (
                  <li key={tag.qrCode} className="flex items-center gap-3 px-3 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data: URL SVG */}
                    <img src={tag.qrImage} alt="" className="size-12 shrink-0 rounded bg-white p-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-fg">{tag.qrCode}</p>
                      <p className="text-xs text-fg-secondary">
                        จาก {tag.sourceLotNo}
                        {tag.origins.length > 0 &&
                          ` · ต้นทาง ${tag.origins.map((o) => `${o.lotNo} (${o.qty})`).join(", ")}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums text-fg">{tag.qty}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => setPrinting([tag])}>
                        <Printer className="size-3.5" /> พิมพ์
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              ปิด
            </Button>
            {tags && tags.length > 0 && (
              <Button onClick={() => setPrinting(tags)}>
                <Printer className="size-4" /> พิมพ์ทั้งหมด {tags.length} ใบ
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TransferTagSheet tags={printing} context={context} onDone={() => setPrinting(null)} />
    </>
  );
}
