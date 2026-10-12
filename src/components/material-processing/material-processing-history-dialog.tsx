"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { processingHistoryAction } from "@/app/(dashboard)/material-processing/actions";
import type { ProcessingHistory, ProcessingSource } from "@/lib/api/material-processing";
import { formatNumber } from "@/lib/utils";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export function MaterialProcessingHistoryDialog({ source, onClose, onOutput }: { source: ProcessingSource; onClose: () => void; onOutput: (id: string) => void }) {
  const [history, setHistory] = React.useState<ProcessingHistory[] | null>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    let cancelled = false;
    processingHistoryAction(source.id).then((result) => {
      if (cancelled) return;
      if (result.status === "success") setHistory(result.history); else setError(result.message);
    }).catch(() => { if (!cancelled) setError(CONNECTION_ERROR_MESSAGE); });
    return () => { cancelled = true; };
  }, [source.id]);
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent fullScreenOnMobile size="xl"><DialogHeader><DialogTitle>ประวัติแปรรูป · {source.internalLotNo}</DialogTitle><DialogDescription>{source.materialCode} · {source.materialName} — แปรรูปแล้ว {formatNumber(Number(source.processedQuantity))} {source.unit}</DialogDescription></DialogHeader>
    {error ? <p role="alert" className="text-sm text-danger">{error}</p> : history === null ? <p className="text-sm text-fg-secondary">กำลังโหลดประวัติ…</p> : history.length === 0 ? <p className="py-8 text-center text-sm text-fg-secondary">ยังไม่มีประวัติแปรรูป</p> : <div className="space-y-4">{history.map((entry) => <article key={entry.id} className="rounded-xl border border-border bg-surface-2 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-mono text-sm font-semibold text-fg">{entry.code}</h3><Badge variant="success">แปรรูปแล้ว</Badge></div><p className="mt-2 text-sm text-fg">{entry.targetMaterialCode} · {entry.targetMaterialName}</p><p className="mt-1 text-sm text-fg-secondary">ใช้ {formatNumber(Number(entry.sourceQuantity))} {source.unit} × {formatNumber(entry.piecesPerUnit)} ชิ้น − เสีย {formatNumber(entry.scrapQuantity)} ชิ้น = {formatNumber(Number(entry.outputQuantity))} ชิ้นดี</p><p className="mt-1 text-xs text-fg-secondary">{entry.packageCount} กล่อง · กล่องละ {formatNumber(entry.packingQuantity)} ชิ้น · {new Date(entry.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p><p className="mt-2 text-xs text-fg-secondary">ต้นทาง: {entry.sourcePackages.map((pkg) => `${pkg.lotDetailNo ?? pkg.packageId} (${formatNumber(Number(pkg.quantity))})`).join(", ")}</p>{entry.remark && <p className="mt-2 text-xs text-fg-secondary">หมายเหตุ: {entry.remark}</p>}<Button className="mt-3" variant="secondary" size="sm" onClick={() => onOutput(entry.outputReceivingId)}>ดูล็อตใหม่ / พิมพ์ QR · {entry.outputLotNo}</Button></article>)}</div>}
  </DialogContent></Dialog>;
}
