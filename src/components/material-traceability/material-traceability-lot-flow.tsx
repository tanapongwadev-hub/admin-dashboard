"use client";

import { ChevronDown, PackageMinus, PackagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { lotColor } from "@/lib/lot-colors";
import type { LotFlow, LotFlowEntry } from "@/lib/api/material-traceability";

// A lot and the disbursements that consumed it share that lot's color.
const colorOf = (lot: LotFlowEntry) => lotColor(lot.internalLotNo);

function formatQty(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n.toLocaleString("th-TH", { maximumFractionDigits: 4 }) : String(value);
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("th-TH", { dateStyle: "medium" });
}

const linkClass = "font-mono text-xs font-medium text-primary hover:underline";

function issuedTotal(lot: LotFlowEntry): number {
  return lot.issues.reduce((sum, issue) => sum + issue.quantity, 0);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-fg-muted">{label}</p>
      <p className="truncate text-sm font-semibold text-fg tabular-nums">{value}</p>
    </div>
  );
}

// Shown only while a single material is filtered. Data is grouped
// Material → Lot (one receiving = one lot); each lot is a collapsible row whose
// body is the sub-detail: boxes (SUB QR) of the lot and the disbursements that
// consumed it (non-reversed FIFO issue history).
export function MaterialTraceabilityLotFlow({
  materialCode,
  flow,
  onOpenReceiving,
  onOpenDisbursement,
}: {
  materialCode: string;
  flow: LotFlow;
  onOpenReceiving: (id: string) => void;
  onOpenDisbursement: (id: string) => void;
}) {
  const unit = flow.lots.find((l) => l.unit)?.unit ?? "";
  const totalReceived = flow.lots.reduce((s, l) => s + (Number(l.receivedQty) || 0), 0);
  const totalIssued = flow.lots.reduce((s, l) => s + issuedTotal(l), 0);
  const totalRemaining = flow.lots.reduce((s, l) => s + (Number(l.remainingQty) || 0), 0);

  return (
    <section className="rounded-lg border border-border bg-surface" aria-label="Material และ Lot">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-fg-muted">Material</p>
          <h2 className="truncate text-sm font-semibold text-fg">
            <span className="font-mono">{flow.material?.code ?? materialCode}</span>
            {flow.material?.name && <span className="font-normal text-fg-secondary"> · {flow.material.name}</span>}
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Stat label="จำนวน Lot" value={String(flow.lots.length)} />
          <Stat label="รับเข้ารวม" value={`${formatQty(totalReceived)} ${unit}`} />
          <Stat label="จ่ายออกรวม" value={`${formatQty(totalIssued)} ${unit}`} />
          <Stat label="คงเหลือ" value={`${formatQty(totalRemaining)} ${unit}`} />
        </div>
      </div>

      {flow.lots.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-fg-muted">ยังไม่มีการรับเข้าของวัสดุนี้</p>
      ) : (
        <div className="divide-y divide-border">
          {flow.lots.map((lot, index) => (
            <details key={lot.receivingId} open={index === 0} className={`group border-l-4 ${colorOf(lot).border}`}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                <ChevronDown className="size-4 shrink-0 text-fg-muted transition-transform group-open:rotate-180" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-sm font-semibold ${colorOf(lot).soft} ${colorOf(lot).text}`}
                    >
                      {lot.internalLotNo}
                    </span>
                    <Badge variant="neutral">{lot.status}</Badge>
                  </div>
                  <p className="text-xs text-fg-muted">
                    รับเข้า {formatDate(lot.receiveDate)}
                    {lot.supplierLotNo ? ` · Supplier Lot ${lot.supplierLotNo}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Stat label="รับเข้า" value={`${formatQty(lot.receivedQty)} ${lot.unit ?? ""}`} />
                  <Stat label="จ่ายออก" value={`${formatQty(issuedTotal(lot))} ${lot.unit ?? ""}`} />
                  <Stat label="คงเหลือ" value={`${formatQty(lot.remainingQty)} ${lot.unit ?? ""}`} />
                </div>
              </summary>

              <div className="grid gap-4 border-t border-dashed border-border bg-surface-2/40 px-4 py-3 lg:grid-cols-2">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className={`flex items-center gap-1.5 text-xs font-semibold ${colorOf(lot).text}`}>
                      <PackagePlus className="size-3.5" /> กล่อง / SUB QR ({lot.boxes.length})
                    </h3>
                    <button type="button" className={linkClass} onClick={() => onOpenReceiving(lot.receivingId)}>
                      ดูใบรับเข้า
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {lot.boxes.map((box) => (
                      <li
                        key={box.lotDetailNo}
                        className={`flex items-center justify-between gap-2 rounded-md border-l-4 px-3 py-1.5 text-xs ${colorOf(lot).border} ${colorOf(lot).soft}`}
                      >
                        <span className="truncate font-mono text-fg">{box.lotDetailNo}</span>
                        <span className="shrink-0 text-fg-muted">
                          {formatQty(box.currentQuantity)} / {formatQty(box.initialQuantity)} · {box.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="min-w-0">
                  <h3 className={`mb-2 flex items-center gap-1.5 text-xs font-semibold ${colorOf(lot).text}`}>
                    <PackageMinus className="size-3.5" /> จ่ายออกให้เอกสาร ({lot.issues.length})
                  </h3>
                  {lot.issues.length === 0 ? (
                    <p className="text-xs text-fg-muted">ยังไม่มีการจ่ายออกจาก Lot นี้</p>
                  ) : (
                    <ul className="space-y-1">
                      {lot.issues.map((issue, i) => (
                        <li
                          key={`${issue.disbursementId ?? issue.disbursementNo ?? i}`}
                          className={`rounded-md border-l-4 px-3 py-1.5 text-xs ${colorOf(lot).border} ${colorOf(lot).soft}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            {issue.disbursementId ? (
                              <button
                                type="button"
                                className={linkClass}
                                onClick={() => onOpenDisbursement(issue.disbursementId!)}
                              >
                                {issue.disbursementNo ?? "—"}
                              </button>
                            ) : (
                              <span className="font-mono">{issue.disbursementNo ?? "—"}</span>
                            )}
                            <span className="font-semibold text-fg">
                              {formatQty(issue.quantity)} {lot.unit ?? ""}
                            </span>
                          </div>
                          <p className="mt-0.5 text-fg-muted">
                            {[
                              issue.productionOrder && `PO: ${issue.productionOrder}`,
                              issue.department,
                              issue.boxes.length > 0 && `กล่อง: ${issue.boxes.join(", ")}`,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {flow.truncated && (
        <p className="border-t border-border px-4 py-2 text-xs text-fg-muted">
          แสดงเฉพาะ Lot รับเข้า 30 รายการแรกของวัสดุนี้ กรองด้วยช่วงวันที่เพื่อดูรายการอื่น
        </p>
      )}
    </section>
  );
}
