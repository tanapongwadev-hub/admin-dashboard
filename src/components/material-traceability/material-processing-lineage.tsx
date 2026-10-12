"use client";

import { ArrowRight, Scissors } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MaterialProcessingTrace } from "@/lib/api/material-traceability";
import type { DrillTarget } from "./material-traceability-details";

const quantity = (value: string | number) => Number(value).toLocaleString("th-TH", { maximumFractionDigits: 4 });

export function MaterialProcessingLineage({ entries, onNavigate, showEmpty = false }: {
  entries: MaterialProcessingTrace[];
  onNavigate: (target: DrillTarget) => void;
  showEmpty?: boolean;
}) {
  if (!entries.length && !showEmpty) return null;
  return (
    <section aria-label="สอบกลับการแปรรูป" className="overflow-hidden rounded-xl border border-primary/20">
      <header className="border-b border-border bg-primary-soft px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-primary"><Scissors className="size-4" aria-hidden="true" />สอบกลับการแปรรูป</h3>
        <p className="mt-1 text-xs leading-relaxed text-fg-secondary">ล็อตวัตถุดิบ → กระบวนการตัด → ล็อตชิ้นงาน → ประวัติจ่ายออก</p>
      </header>
      {!entries.length ? <p className="p-4 text-sm text-fg-muted">ล็อตนี้ยังไม่มีรายการแปรรูป</p> :
        <div className="divide-y divide-border">{entries.map((entry) => {
          const remainder = Number(entry.outputQuantity) % entry.packingQuantity;
          return <article key={entry.id} className="space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h4 className="break-all text-sm font-semibold text-fg">{entry.code}</h4><p className="mt-1 text-xs text-fg-muted">{new Date(entry.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} · โดย {entry.performedBy}</p></div>
              <Badge variant="success">แปรรูปแล้ว</Badge>
            </div>
            <div className="grid items-start gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-xs text-fg-muted">วัตถุดิบต้นทาง · {entry.sourceShape ?? "—"}</p>
                <button type="button" className="mt-1 break-all text-left text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate({ type: "main-qr", id: entry.sourceReceivingId })}>{entry.sourceLotNo}</button>
                <p className="mt-2 break-words text-xs text-fg-secondary">{entry.sourceMaterialCode} · {entry.sourceMaterialName}</p>
                <p className="mt-2 text-sm font-medium text-fg">ใช้ {quantity(entry.sourceQuantity)} {entry.sourceUnit ?? "หน่วย"}</p>
              </div>
              <ArrowRight className="mx-auto size-4 rotate-90 text-primary sm:mt-8 sm:rotate-0" aria-hidden="true" />
              <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-xs text-fg-muted">ชิ้นงานหลังแปรรูป</p>
                <button type="button" className="mt-1 break-all text-left text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate({ type: "main-qr", id: entry.outputReceivingId })}>{entry.outputLotNo}</button>
                <p className="mt-2 break-words text-xs text-fg-secondary">{entry.targetMaterialCode} · {entry.targetMaterialName}</p>
                <p className="mt-2 text-sm font-medium text-fg">ได้ {quantity(entry.outputQuantity)} {entry.outputUnit ?? "ชิ้น"}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border px-3 py-2 text-sm leading-relaxed text-fg">
              {quantity(entry.sourceQuantity)} {entry.sourceUnit ?? "หน่วย"} × {quantity(entry.piecesPerUnit)} ชิ้น/หน่วย − เศษเสีย {quantity(entry.scrapQuantity)} ชิ้น = <strong>{quantity(entry.outputQuantity)} ชิ้นดี</strong>
              <p className="mt-1 text-xs text-fg-secondary">บรรจุ {entry.packageCount} กล่อง · กล่องละ {quantity(entry.packingQuantity)} ชิ้น{remainder > 0 ? ` · กล่องสุดท้าย ${quantity(remainder)} ชิ้น` : ""}</p>
            </div>
            <div><p className="mb-2 text-xs font-medium text-fg-secondary">SUB QR ต้นทางที่ใช้จริง</p><ul className="flex flex-wrap gap-2">{entry.sourcePackages.map((pkg) => <li key={pkg.packageId}><button type="button" className="rounded-md border border-border px-2 py-1 text-left text-xs text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate({ type: "sub-qr", id: pkg.packageId })}><span className="break-all">{pkg.lotDetailNo ?? pkg.packageId}</span> · {quantity(pkg.quantity)} {entry.sourceUnit ?? "หน่วย"}</button></li>)}</ul></div>
            {entry.remark && <p className="whitespace-pre-wrap break-words text-xs text-fg-secondary">หมายเหตุ: {entry.remark}</p>}
            <p className="text-xs text-fg-muted">กดล็อตชิ้นงานเพื่อดู SUB QR และใบจ่ายออก หรือกดล็อตวัตถุดิบเพื่อย้อนกลับต้นทาง</p>
          </article>;
        })}</div>}
    </section>
  );
}
