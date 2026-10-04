"use client";

import * as React from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MaterialTraceabilityTimeline } from "@/components/material-traceability/material-traceability-timeline";
import {
  traceMainQrAction,
  traceSubQrAction,
  traceReceivingAction,
  traceDisbursementAction,
} from "@/app/(dashboard)/materials/materials-report/actions";
import { lotColor } from "@/lib/lot-colors";
import type { DisbursementTrace, MainQrTrace, SubQrTrace } from "@/lib/api/material-traceability";

export type DrillTarget =
  | { type: "main-qr"; id: string }
  | { type: "sub-qr"; id: string }
  | { type: "receiving"; id: string }
  | { type: "disbursement"; id: string };

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatQty(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("th-TH", { maximumFractionDigits: 4 }) : value;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "ร่าง",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิก",
  pending: "รอดำเนินการ",
  in_stock: "มีสต็อก",
  partial: "ใช้บางส่วน",
  issued: "หมดสต็อก",
  damaged: "ชำรุด",
  returned: "คืนแล้ว",
};

type StatusBadgeVariant = "success" | "warning" | "neutral" | "danger" | "outline";

// Package/receiving/disbursement status → badge color, covering every real
// status value (including 'cancelled' and 'damaged', which the original
// two-branch ternary this replaces silently fell through to "success" —
// a cancelled package rendering a green badge was a real bug caught during
// live verification against the backend).
function statusBadgeVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case "cancelled":
    case "damaged":
      return "danger";
    case "partial":
      return "warning";
    case "issued":
    case "pending":
      return "neutral";
    case "in_stock":
    case "confirmed":
    case "returned":
      return "success";
    default:
      return "outline";
  }
}

/**
 * §6/§7/§12/§14 combined: one dialog that resolves whatever the caller asks
 * for (a MAIN QR, a SUB QR, a Receiving, or a Disbursement) and renders its
 * full trace — Receiving Information / QR Structure / Issue History for a
 * MAIN QR; parent-MAIN-QR + Issue + Adjustment history for a SUB QR; header
 * + FIFO allocation history for a Disbursement. Every code inside is itself
 * clickable and pushes a new target onto a local back-stack (`history`), so
 * "Material → Lot → MAIN QR → SUB QR → Stock Movement → Receiving/
 * Disbursement" (§14 Drill-down) and its reverse both work from one dialog
 * instead of a chain of separate modals.
 */
// The outer dialog only decides open/closed. Its actual navigation state
// (`current`/`history`) lives in `DetailsDialogBody`, remounted via a key
// derived from the *external* `target` prop — so a brand-new target (from
// the table or QR search) always starts a fresh drill session with empty
// history, while `navigate()` calls inside that mounted instance never
// trigger a remount (they don't touch the key). This is the same
// parent-owned "key resets state on open" pattern documented in AGENTS.md §
// Material Receiving's "Rule for future dialogs that reset local state on
// open" — chosen over a reset-on-prop-change `useEffect`, which the
// project's lint config rejects (`react-hooks/set-state-in-effect`).
export function MaterialTraceabilityDetailsDialog({
  target,
  onOpenChange,
}: {
  target: DrillTarget | null;
  onOpenChange: (target: DrillTarget | null) => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onOpenChange(null)}>
      <DialogContent size="xl" fullScreenOnMobile className="flex max-h-[85vh] flex-col">
        {target && <DetailsDialogBody key={`${target.type}:${target.id}`} initialTarget={target} />}
      </DialogContent>
    </Dialog>
  );
}

type TraceResult =
  | { key: string; status: "success"; data: MainQrTrace | SubQrTrace | DisbursementTrace }
  | { key: string; status: "error"; message: string };

function targetKey(t: DrillTarget): string {
  return `${t.type}:${t.id}`;
}

function DetailsDialogBody({ initialTarget }: { initialTarget: DrillTarget }) {
  const [history, setHistory] = React.useState<DrillTarget[]>([]);
  const [current, setCurrent] = React.useState<DrillTarget>(initialTarget);
  const [result, setResult] = React.useState<TraceResult | null>(null);

  // Result is keyed by the target it belongs to — loading/error/data are
  // derived by comparison below, and the only setState call happens inside
  // the resolved-promise continuation, never synchronously in the effect
  // body (see AGENTS.md § Material Receiving's "derive, don't effect" rule
  // and products-details-dialog.tsx's identical BOM-tab fetch pattern).
  React.useEffect(() => {
    const key = targetKey(current);
    const fetcher =
      current.type === "main-qr"
        ? traceMainQrAction(current.id)
        : current.type === "sub-qr"
          ? traceSubQrAction(current.id)
          : current.type === "receiving"
            ? traceReceivingAction(current.id)
            : traceDisbursementAction(current.id);
    let cancelled = false;
    fetcher.then((res) => {
      if (cancelled) return;
      setResult(
        res.status === "success" ? { key, status: "success", data: res.data } : { key, status: "error", message: res.message }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [current]);

  const key = targetKey(current);
  const loading = result?.key !== key;
  const data = result?.key === key && result.status === "success" ? result.data : null;
  const error = result?.key === key && result.status === "error" ? result.message : null;

  function navigate(next: DrillTarget) {
    setHistory((prev) => [...prev, current]);
    setCurrent(next);
  }

  function back() {
    setHistory((prev) => {
      const copy = [...prev];
      const last = copy.pop();
      if (last) setCurrent(last);
      return copy;
    });
  }

  return (
    <>
      <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Button type="button" variant="ghost" size="icon" onClick={back} aria-label="ย้อนกลับ">
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div>
            <DialogTitle>
              {current.type === "main-qr" && "MAIN QR — รายละเอียดการรับเข้า"}
              {current.type === "sub-qr" && "SUB QR — รายละเอียดกล่อง"}
              {current.type === "receiving" && "รายละเอียดการรับเข้า"}
              {current.type === "disbursement" && "รายละเอียดการจ่ายออก"}
            </DialogTitle>
            <DialogDescription>สอบกลับตั้งแต่ต้นทางถึงปลายทาง — กดที่รหัสใดก็ได้เพื่อดูรายละเอียดต่อ</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-fg-muted">
            <Loader2 className="size-4 animate-spin" /> กำลังโหลดข้อมูล...
          </div>
        )}
        {!loading && error && <p className="py-16 text-center text-sm text-danger">{error}</p>}
        {!loading && !error && data && (current.type === "main-qr" || current.type === "receiving") && (
          <MainQrDetail trace={data as MainQrTrace} onNavigate={navigate} />
        )}
        {!loading && !error && data && current.type === "sub-qr" && (
          <SubQrDetail trace={data as SubQrTrace} onNavigate={navigate} />
        )}
        {!loading && !error && data && current.type === "disbursement" && (
          <DisbursementDetail trace={data as DisbursementTrace} onNavigate={navigate} />
        )}
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1.5 text-sm last:border-b-0">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-medium text-fg">{value}</span>
    </div>
  );
}

function MainQrDetail({ trace, onNavigate }: { trace: MainQrTrace; onNavigate: (t: DrillTarget) => void }) {
  const r = trace.receiving;
  const color = lotColor(r.internalLotNo);
  const unit = r.unitSymbol ?? "";
  const received = Number(r.convertedQuantity) || 0;
  const remaining = Number(trace.currentRemaining) || 0;
  const issued = trace.issueHistory
    .filter((h) => !h.reversedAt)
    .reduce((s, h) => s + (Number(h.disbursedQuantity) || 0), 0);
  const usedPct = received > 0 ? Math.min(100, Math.round(((received - remaining) / received) * 100)) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Hero: lot number in its lot color, status, then headline numbers. */}
      <section className={`overflow-hidden rounded-lg border border-border border-l-4 ${color.border}`}>
        <div className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 ${color.soft}`}>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-fg-muted">Lot รับเข้า (MAIN QR)</p>
            <p className={`font-mono text-xl font-semibold ${color.text}`}>{r.internalLotNo}</p>
            <p className="mt-0.5 truncate text-xs text-fg-secondary">
              {r.material ? `${r.material.code} · ${r.material.name}` : "—"}
            </p>
          </div>
          <Badge variant={statusBadgeVariant(r.status)} dot>
            {STATUS_LABELS[r.status] ?? r.status}
          </Badge>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KpiCell label={`รับเข้า ${unit}`} value={formatQty(r.convertedQuantity)} />
            <KpiCell label="จ่ายออกแล้ว" value={formatQty(String(issued))} />
            <KpiCell label="คงเหลือ" value={formatQty(trace.currentRemaining)} tone="primary" />
            <KpiCell label="จำนวนกล่อง" value={String(trace.packages.length)} />
          </div>

          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-fg-muted">
              <span>ใช้ไปแล้ว</span>
              <span className="tabular-nums">{usedPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={usedPct} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${usedPct}%` }} />
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
            <MetaCell label="วันที่รับเข้า" value={formatDate(r.receiveDate)} />
            <MetaCell label="Supplier Lot" value={r.supplierLotNo} />
            <MetaCell label="Supplier" value={r.supplier ? (r.supplier.nameEn ?? r.supplier.nameTh) : null} />
            <MetaCell label="จำนวนที่กรอก" value={`${formatQty(r.receiveQuantity)} ${unit}`} />
            <MetaCell label="ผู้ยืนยันรับเข้า" value={r.confirmedBy} />
            <MetaCell label="ยืนยันเมื่อ" value={r.confirmedAt ? formatDateTime(r.confirmedAt) : null} />
            <MetaCell label="สร้างโดย" value={r.createdBy} />
            <MetaCell label="สร้างเมื่อ" value={formatDateTime(r.createdAt)} />
          </dl>
        </div>
      </section>

      {/* MAIN → SUB: one tile per box with its own remaining-quantity bar. */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-fg">กล่อง / SUB QR ({trace.packages.length})</h3>
        {trace.packages.length === 0 ? (
          <p className="text-sm text-fg-muted">ยังไม่มี SUB QR</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {trace.packages.map((pkg) => {
              const initial = Number(pkg.initialQuantity) || 0;
              const current = Number(pkg.currentQuantity) || 0;
              const pct = initial > 0 ? Math.max(0, Math.min(100, Math.round((current / initial) * 100))) : 0;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => onNavigate({ type: "sub-qr", id: pkg.id })}
                  className="rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-mono text-sm text-primary">
                      #{pkg.packageNo} · {pkg.lotDetailNo ?? pkg.id}
                    </span>
                    <Badge variant={statusBadgeVariant(pkg.status)}>{STATUS_LABELS[pkg.status] ?? pkg.status}</Badge>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-fg-muted tabular-nums">
                    คงเหลือ {formatQty(pkg.currentQuantity)} / {formatQty(pkg.initialQuantity)} {unit}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-fg">ประวัติการจ่ายออก (ทุกกล่องรวมกัน)</h3>
        <IssueHistoryTable history={trace.issueHistory} onNavigate={onNavigate} />
      </section>

      <details className="group rounded-lg border border-border">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
          Timeline ({trace.movements.length})
        </summary>
        <div className="border-t border-border p-4">
          <MaterialTraceabilityTimeline movements={trace.movements} />
        </div>
      </details>
    </div>
  );
}

function SubQrDetail({ trace, onNavigate }: { trace: SubQrTrace; onNavigate: (t: DrillTarget) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-border p-4">
        <h3 className="mb-2 text-sm font-semibold text-fg">SUB QR</h3>
        <InfoRow label="SUB QR (Lot Detail)" value={<span className="font-mono">{trace.package.lotDetailNo}</span>} />
        <InfoRow label="Initial Qty" value={formatQty(trace.package.initialQuantity)} />
        <InfoRow label="Current Qty" value={formatQty(trace.package.currentQuantity)} />
        <InfoRow label="Status" value={<Badge variant={statusBadgeVariant(trace.package.status)}>{STATUS_LABELS[trace.package.status] ?? trace.package.status}</Badge>} />
        {trace.parentMainQr && (
          <>
            <InfoRow
              label="Parent MAIN QR"
              value={
                <button
                  type="button"
                  className="font-mono text-primary underline-offset-2 hover:underline"
                  onClick={() => onNavigate({ type: "main-qr", id: trace.parentMainQr!.id })}
                >
                  {trace.parentMainQr.internalLotNo}
                </button>
              }
            />
            <InfoRow label="Material" value={trace.parentMainQr.material ? `${trace.parentMainQr.material.code} · ${trace.parentMainQr.material.name}` : "—"} />
            <InfoRow label="Receiving Date" value={formatDate(trace.parentMainQr.receiveDate)} />
          </>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-fg">Issue History</h3>
        <IssueHistoryTable history={trace.issueHistory} onNavigate={onNavigate} />
      </section>

      {trace.adjustmentHistory.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-fg">Adjustment History</h3>
          <MaterialTraceabilityTimeline movements={trace.adjustmentHistory} />
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-fg">Timeline</h3>
        <MaterialTraceabilityTimeline movements={trace.movements} />
      </section>
    </div>
  );
}

function IssueHistoryTable({
  history,
  onNavigate,
}: {
  history: import("@/lib/api/material-traceability").SubQrIssueHistoryEntry[];
  onNavigate: (t: DrillTarget) => void;
}) {
  if (history.length === 0) return <p className="text-sm text-fg-muted">ยังไม่เคยถูกจ่ายออก</p>;
  return (
    <div className="flex flex-col gap-2">
      {history.map((h) => (
        <div key={h.allocationId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
          <div>
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => h.disbursementId && onNavigate({ type: "disbursement", id: h.disbursementId })}
            >
              {h.disbursementNo ?? h.disbursementId}
            </button>
            <p className="text-xs text-fg-muted">
              จ่าย {formatQty(h.disbursedQuantity)} {h.productionOrder ? `· PO: ${h.productionOrder}` : ""}
            </p>
          </div>
          {h.reversedAt ? (
            <Badge variant="danger">ยกเลิกแล้ว {formatDate(h.reversedAt)}</Badge>
          ) : (
            <Badge variant="success">ใช้งานอยู่</Badge>
          )}
        </div>
      ))}
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-fg-muted">{label}</dt>
      <dd className="truncate text-sm font-medium text-fg">{value || "—"}</dd>
    </div>
  );
}

function KpiCell({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <p className="text-[11px] text-fg-muted">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${tone === "primary" ? "text-primary" : "text-fg"}`}>{value}</p>
    </div>
  );
}

function DisbursementDetail({ trace, onNavigate }: { trace: DisbursementTrace; onNavigate: (t: DrillTarget) => void }) {
  const d = trace.disbursement;
  const cancelled = d.status === "cancelled";
  const totalRequested = trace.items.reduce((s, i) => s + (Number(i.requestedQuantity) || 0), 0);
  const totalIssued = trace.items.reduce((s, i) => s + (Number(i.disbursedQuantity) || 0), 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Hero: document number + status + date, then the headline numbers. */}
      <section className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-fg-muted">เลขที่เอกสารจ่ายออก</p>
            <p className="font-mono text-xl font-semibold text-fg">{d.disbursementNo}</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {formatDate(d.disbursementDate)} · {d.disbursementType}
            </p>
          </div>
          <Badge variant={statusBadgeVariant(d.status)} dot>
            {STATUS_LABELS[d.status] ?? d.status}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <KpiCell label="จำนวนรายการวัสดุ" value={String(trace.items.length)} />
          <KpiCell label="ขอเบิกรวม" value={formatQty(String(totalRequested))} />
          <KpiCell label="จ่ายออกรวม" value={formatQty(String(totalIssued))} tone="primary" />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
          <MetaCell label="Production Order" value={d.productionOrder} />
          <MetaCell label="เอกสารอ้างอิง" value={d.referenceNo} />
          <MetaCell label="ผู้ขอเบิก" value={d.requestedBy} />
          <MetaCell label="ผู้อนุมัติ" value={d.approvedBy} />
          <MetaCell label="ผู้ยืนยัน" value={d.confirmedBy} />
          <MetaCell label="ยืนยันเมื่อ" value={d.confirmedAt ? formatDateTime(d.confirmedAt) : null} />
        </dl>

        {cancelled && (
          <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            ยกเลิกเมื่อ {formatDateTime(d.cancelledAt)} · เหตุผล: {d.cancelReason ?? "—"}
          </p>
        )}
      </section>

      {/* One card per material; allocations grouped by the receiving lot they were cut from. */}
      {trace.items.map((item) => {
        const lots = new Map<string, { lotNo: string; receiveDate: string | null; allocations: typeof item.fifoAllocations }>();
        for (const a of item.fifoAllocations) {
          const key = a.internalLotNo ?? "—";
          const lot = lots.get(key) ?? { lotNo: key, receiveDate: a.receiveDate, allocations: [] };
          lot.allocations.push(a);
          lots.set(key, lot);
        }
        return (
          <section key={item.id} className="overflow-hidden rounded-lg border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-2 px-4 py-3">
              <h3 className="min-w-0 truncate text-sm font-semibold text-fg">
                {item.material ? (
                  <>
                    <span className="font-mono">{item.material.code}</span>
                    <span className="font-normal text-fg-secondary"> · {item.material.name}</span>
                  </>
                ) : (
                  item.materialId
                )}
              </h3>
              <p className="text-xs text-fg-muted">
                ขอเบิก {formatQty(item.requestedQuantity)} · จ่ายจริง{" "}
                <span className="font-semibold text-fg">{formatQty(item.disbursedQuantity)}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 p-4">
              <p className="text-xs font-medium text-fg-muted">จ่ายจาก Lot / กล่อง (ตามลำดับ FIFO) — แต่ละ Lot แยกสี</p>
              {lots.size === 0 && <p className="text-xs text-fg-muted">ไม่มีข้อมูล FIFO</p>}
              {[...lots.values()].map((lot) => {
                const active = lot.allocations
                  .filter((a) => !a.reversedAt)
                  .reduce((s, a) => s + (Number(a.disbursedQuantity) || 0), 0);
                return (
                  <div key={lot.lotNo} className={`rounded-md border border-l-4 border-border ${lotColor(lot.lotNo).border}`}>
                    <div className={`flex items-center justify-between gap-2 border-b border-border px-3 py-2 ${lotColor(lot.lotNo).soft}`}>
                      <div className="min-w-0">
                        <span className={`font-mono text-sm font-semibold ${lotColor(lot.lotNo).text}`}>{lot.lotNo}</span>
                        <span className="ml-2 text-xs text-fg-muted">รับเข้า {formatDate(lot.receiveDate)}</span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">{formatQty(String(active))}</span>
                    </div>
                    <ul className="divide-y divide-border">
                      {lot.allocations.map((a) => (
                        <li
                          key={a.id}
                          className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs ${a.reversedAt ? "opacity-60" : ""}`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="w-6 shrink-0 text-fg-muted">#{a.fifoOrder}</span>
                            <button
                              type="button"
                              className="truncate font-mono text-primary underline-offset-2 hover:underline"
                              onClick={() => onNavigate({ type: "sub-qr", id: a.packageId })}
                            >
                              {a.lotDetailNo ?? a.packageId}
                            </button>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`font-medium tabular-nums ${a.reversedAt ? "line-through" : ""}`}>
                              {formatQty(a.disbursedQuantity)}
                            </span>
                            {a.reversedAt ? <Badge variant="danger">ยกเลิกแล้ว</Badge> : <Badge variant="success">ใช้งาน</Badge>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <details className="group rounded-lg border border-border">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
          Timeline ({trace.movements.length})
        </summary>
        <div className="border-t border-border p-4">
          <MaterialTraceabilityTimeline movements={trace.movements} />
        </div>
      </details>
    </div>
  );
}
