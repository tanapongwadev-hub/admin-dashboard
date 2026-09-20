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
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-border p-4">
        <h3 className="mb-2 text-sm font-semibold text-fg">Receiving Information</h3>
        <InfoRow label="Receiving No / Internal Lot" value={<span className="font-mono">{r.internalLotNo}</span>} />
        <InfoRow label="Receiving Date" value={formatDate(r.receiveDate)} />
        <InfoRow label="Material" value={r.material ? `${r.material.code} · ${r.material.name}` : "—"} />
        <InfoRow label="Received Qty" value={`${formatQty(r.receiveQuantity)} ${r.unitSymbol ?? ""}`} />
        <InfoRow label="Converted Qty" value={formatQty(r.convertedQuantity)} />
        <InfoRow label="Supplier Lot" value={r.supplierLotNo ?? "—"} />
        <InfoRow label="Supplier" value={r.supplier ? (r.supplier.nameEn ?? r.supplier.nameTh) : "—"} />
        <InfoRow label="Status" value={<Badge variant={statusBadgeVariant(r.status)}>{STATUS_LABELS[r.status] ?? r.status}</Badge>} />
        <InfoRow label="Received By" value={r.confirmedBy ?? "—"} />
        <InfoRow label="Created At" value={formatDateTime(r.createdAt)} />
        <InfoRow label="Current Remaining (ทุกกล่องรวม)" value={formatQty(trace.currentRemaining)} />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-fg">QR Structure — MAIN → SUB</h3>
        <div className="flex flex-col gap-2">
          {trace.packages.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onNavigate({ type: "sub-qr", id: pkg.id })}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:bg-surface-2"
            >
              <div>
                <p className="font-mono text-sm text-primary">{pkg.lotDetailNo ?? pkg.id}</p>
                <p className="text-xs text-fg-muted">
                  Initial: {formatQty(pkg.initialQuantity)} · Current: {formatQty(pkg.currentQuantity)}
                </p>
              </div>
              <Badge variant={statusBadgeVariant(pkg.status)}>
                {STATUS_LABELS[pkg.status] ?? pkg.status}
              </Badge>
            </button>
          ))}
          {trace.packages.length === 0 && <p className="text-sm text-fg-muted">ยังไม่มี SUB QR</p>}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-fg">Issue History (ทุก SUB QR รวมกัน)</h3>
        <IssueHistoryTable history={trace.issueHistory} onNavigate={onNavigate} />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-fg">Timeline</h3>
        <MaterialTraceabilityTimeline movements={trace.movements} />
      </section>
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

function DisbursementDetail({ trace, onNavigate }: { trace: DisbursementTrace; onNavigate: (t: DrillTarget) => void }) {
  const d = trace.disbursement;
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-border p-4">
        <h3 className="mb-2 text-sm font-semibold text-fg">Disbursement Information</h3>
        <InfoRow label="Disbursement No" value={<span className="font-mono">{d.disbursementNo}</span>} />
        <InfoRow label="Date" value={formatDate(d.disbursementDate)} />
        <InfoRow label="Type" value={d.disbursementType} />
        <InfoRow label="Status" value={<Badge variant={statusBadgeVariant(d.status)}>{STATUS_LABELS[d.status] ?? d.status}</Badge>} />
        <InfoRow label="Production Order" value={d.productionOrder ?? "—"} />
        <InfoRow label="Reference Document" value={d.referenceNo ?? "—"} />
        <InfoRow label="Requested By" value={d.requestedBy ?? "—"} />
        <InfoRow label="Approved By" value={d.approvedBy ?? "—"} />
        {d.status === "cancelled" && <InfoRow label="Cancel Reason" value={d.cancelReason ?? "—"} />}
      </section>

      {trace.items.map((item) => (
        <section key={item.id} className="rounded-lg border border-border p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">
            {item.material ? `${item.material.code} · ${item.material.name}` : item.materialId}
          </h3>
          <InfoRow label="Requested Qty" value={formatQty(item.requestedQuantity)} />
          <InfoRow label="Issued Qty" value={formatQty(item.disbursedQuantity)} />
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-fg-muted">FIFO Allocation (§13)</p>
            <div className="flex flex-col gap-1.5">
              {item.fifoAllocations.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs">
                  <div>
                    <span className="mr-2 text-fg-muted">#{a.fifoOrder}</span>
                    <button
                      type="button"
                      className="font-mono text-primary underline-offset-2 hover:underline"
                      onClick={() => onNavigate({ type: "sub-qr", id: a.packageId })}
                    >
                      {a.lotDetailNo ?? a.packageId}
                    </button>
                    <span className="ml-2 text-fg-muted">
                      Lot {a.internalLotNo} · รับเข้า {formatDate(a.receiveDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatQty(a.disbursedQuantity)}</span>
                    {a.reversedAt ? <Badge variant="danger">Reversed</Badge> : <Badge variant="success">Active</Badge>}
                  </div>
                </div>
              ))}
              {item.fifoAllocations.length === 0 && <p className="text-xs text-fg-muted">ไม่มีข้อมูล FIFO</p>}
            </div>
          </div>
        </section>
      ))}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-fg">Timeline</h3>
        <MaterialTraceabilityTimeline movements={trace.movements} />
      </section>
    </div>
  );
}
