"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Boxes, ChevronDown, History, Loader2, QrCode, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { MaterialTraceabilityTimeline } from "@/components/material-traceability/material-traceability-timeline";
import { MaterialProcessingLineage } from "./material-processing-lineage";
import {
  traceMainQrAction,
  traceSubQrAction,
  traceReceivingAction,
  traceDisbursementAction,
} from "@/app/(dashboard)/reports/materials/actions";
import { lotColor } from "@/lib/lot-colors";
import type { DisbursementTrace, MainQrTrace, SubQrTrace } from "@/lib/api/material-traceability";

export type DrillTarget =
  | { type: "main-qr"; id: string }
  | { type: "sub-qr"; id: string }
  | { type: "receiving"; id: string }
  | { type: "disbursement"; id: string };

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
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
      <DialogContent size="xl" fullScreenOnMobile className="overflow-hidden p-0">
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
    if (targetKey(next) === targetKey(current)) return;
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
      <DialogHeader className="shrink-0 flex-row items-center justify-between gap-2 space-y-0 pr-12">
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-fg-muted">
            <Loader2 className="size-4 animate-spin" /> กำลังโหลดข้อมูล...
          </div>
        )}
        {!loading && error && <p className="py-16 text-center text-sm text-danger">{error}</p>}
        {!loading && !error && data && (current.type === "main-qr" || current.type === "receiving") && (
          <MainQrDetail key={(data as MainQrTrace).receiving.id} trace={data as MainQrTrace} onNavigate={navigate} />
        )}
        {!loading && !error && data && current.type === "sub-qr" && (
          <SubQrDetail trace={data as SubQrTrace} onNavigate={navigate} />
        )}
        {!loading && !error && data && current.type === "disbursement" && (
          <DisbursementDetail trace={data as DisbursementTrace} onNavigate={navigate} />
        )}
      </div>
      <footer className="flex shrink-0 justify-end border-t border-border bg-surface px-5 py-4 sm:px-6">
        <DialogClose asChild><Button variant="outline">ปิดรายละเอียด</Button></DialogClose>
      </footer>
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
  const [search, setSearch] = React.useState("");
  const [packageFilter, setPackageFilter] = React.useState<"all" | "remaining" | "empty">("all");
  const r = trace.receiving;
  const color = lotColor(r.internalLotNo);
  const unit = r.unitSymbol ?? "";
  const received = Number(r.convertedQuantity) || 0;
  const remaining = Number(trace.currentRemaining) || 0;
  const issued = trace.issueHistory
    .filter((h) => !h.reversedAt)
    .reduce((s, h) => s + (Number(h.disbursedQuantity) || 0), 0);
  const processingHistory = trace.processingHistory ?? [];
  const processed = r.processedQuantity ?? String(processingHistory
    .filter((entry) => entry.sourceReceivingId === r.id)
    .reduce((sum, entry) => sum + Number(entry.sourceQuantity), 0));
  const isRawSource = !r.sourceReceivingId && ["PIPE", "SHEET", "COIL"].includes(r.materialShape ?? "");
  const remainingPct = received > 0 ? Math.max(0, Math.min(100, Math.round(remaining / received * 100))) : 0;
  const query = search.trim().toLowerCase();
  const packages = trace.packages.filter((pkg) =>
    (!query || `${pkg.packageNo} ${pkg.lotDetailNo ?? ""}`.toLowerCase().includes(query)) &&
    (packageFilter === "all" || (packageFilter === "remaining" ? Number(pkg.currentQuantity) > 0 : Number(pkg.currentQuantity) <= 0))
  );

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="สรุปล็อตรับเข้า" className={`overflow-hidden rounded-xl border border-border border-t-4 ${color.border}`}>
        <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${color.soft} ${color.text}`}><QrCode className="size-6" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-fg-muted">MAIN QR · ล็อตรับเข้า</p>
              <h3 className={`mt-1 break-all text-lg font-semibold sm:text-xl ${color.text}`}>{r.internalLotNo}</h3>
              <p className="mt-2 break-words text-sm font-medium text-fg">{r.material?.name ?? "ไม่ระบุวัสดุ"}</p>
              {r.material && <p className="mt-1 break-all text-xs text-fg-secondary">รหัสวัสดุ {r.material.code}</p>}
            </div>
          </div>
          <Badge variant={statusBadgeVariant(r.status)} dot>
            {STATUS_LABELS[r.status] ?? r.status}
          </Badge>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCell label={`รับเข้า ${unit}`} value={formatQty(r.convertedQuantity)} />
            <KpiCell label="จ่ายออกแล้ว" value={formatQty(String(issued))} />
            <KpiCell label="คงเหลือ" value={formatQty(trace.currentRemaining)} tone="primary" />
            <KpiCell label="SUB QR ทั้งหมด" value={`${trace.packages.length} รายการ`} />
          </div>
          {Number(processed) > 0 && <p className="mt-3 rounded-md bg-primary-soft px-3 py-2 text-sm text-primary">ใช้แปรรูปแล้ว {formatQty(processed)} {unit} · แยกจากยอดจ่ายออกทั่วไป</p>}

          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-fg-muted">
              <span>สัดส่วนคงเหลือจากยอดรับเข้า</span>
              <span className="tabular-nums">{remainingPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="สัดส่วนคงเหลือจากยอดรับเข้า" aria-valuenow={remainingPct} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${remainingPct}%` }} />
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
            <MetaCell label="วันที่รับเข้า" value={formatDate(r.receiveDate)} />
            <MetaCell label="ล็อตซัพพลายเออร์" value={r.supplierLotNo} />
            <MetaCell label="ซัพพลายเออร์" value={r.supplier ? (r.supplier.nameTh || r.supplier.nameEn) : null} />
            <MetaCell label="จำนวนที่กรอก" value={`${formatQty(r.receiveQuantity)} ${unit}`} />
            <MetaCell label="ผู้ยืนยันรับเข้า" value={r.confirmedBy} />
            <MetaCell label="ยืนยันเมื่อ" value={r.confirmedAt ? formatDateTime(r.confirmedAt) : null} />
            <MetaCell label="สร้างโดย" value={r.createdBy} />
            <MetaCell label="สร้างเมื่อ" value={formatDateTime(r.createdAt)} />
          </dl>
        </div>
      </section>

      <MaterialProcessingLineage entries={processingHistory} onNavigate={onNavigate} showEmpty={isRawSource} />

      <section aria-label="รายการ SUB QR" className="rounded-xl border border-border p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg"><Boxes className="size-4 text-primary" aria-hidden="true" />รายการ SUB QR</h3>
          <span className="text-xs text-fg-muted">มีคงเหลือ {trace.packages.filter((pkg) => Number(pkg.currentQuantity) > 0).length} / {trace.packages.length} รายการ</span>
        </div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
            <Input aria-label="ค้นหา SUB QR หรือเลขรายการ" placeholder="ค้นหา SUB QR หรือเลขรายการ..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="กรองจำนวนคงเหลือ">
            {(["all", "remaining", "empty"] as const).map((filter) => <Button key={filter} size="sm" variant={packageFilter === filter ? "primary" : "outline"} aria-pressed={packageFilter === filter} onClick={() => setPackageFilter(filter)}>{filter === "all" ? "ทั้งหมด" : filter === "remaining" ? "มีคงเหลือ" : "หมดแล้ว"}</Button>)}
          </div>
        </div>
        <p className="mb-3 text-xs text-fg-muted" role="status" aria-live="polite">แสดง {packages.length} จาก {trace.packages.length} รายการ · กดเพื่อดูรายละเอียด SUB QR</p>
        {packages.length === 0 ? (
          <div className="py-8 text-center">
            <Boxes className="mx-auto mb-3 size-7 text-fg-muted" aria-hidden="true" />
            <p className="text-sm text-fg-secondary">{trace.packages.length ? "ไม่พบ SUB QR ที่ตรงกับตัวกรอง" : "ยังไม่มี SUB QR ในล็อตนี้"}</p>
            {trace.packages.length > 0 && <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setPackageFilter("all"); }}>ล้างตัวกรอง</Button>}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {packages.map((pkg) => {
              const initial = Number(pkg.initialQuantity) || 0;
              const current = Number(pkg.currentQuantity) || 0;
              const pct = initial > 0 ? Math.max(0, Math.min(100, Math.round((current / initial) * 100))) : 0;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => onNavigate({ type: "sub-qr", id: pkg.id })}
                  className="group min-w-0 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-primary/40 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-fg-muted">SUB QR · #{pkg.packageNo}</span>
                    <Badge variant={statusBadgeVariant(pkg.status)}>{STATUS_LABELS[pkg.status] ?? pkg.status}</Badge>
                  </div>
                  <p className="break-all text-sm font-semibold text-primary">{pkg.lotDetailNo ?? pkg.id}</p>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div><p className="text-xs text-fg-muted">คงเหลือ</p><p className="mt-1 text-lg font-semibold tabular-nums text-fg">{formatQty(pkg.currentQuantity)} <span className="text-xs font-normal text-fg-muted">/ {formatQty(pkg.initialQuantity)} {unit}</span></p></div>
                    <ArrowRight className="size-4 shrink-0 text-fg-muted group-hover:text-primary" aria-hidden="true" />
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                    <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="ประวัติการจ่ายออก" className="overflow-hidden rounded-xl border border-border">
        <h3 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-fg"><History className="size-4 text-primary" aria-hidden="true" />ประวัติการจ่ายออก · ทุก SUB QR</h3>
        <div className="overflow-x-auto p-4"><IssueHistoryTable history={trace.issueHistory} onNavigate={onNavigate} /></div>
      </section>

      <details className="group rounded-xl border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          ลำดับความเคลื่อนไหว ({trace.movements.length})<ChevronDown className="size-4 shrink-0 text-fg-muted group-open:rotate-180" aria-hidden="true" />
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

      <MaterialProcessingLineage entries={trace.processingHistory ?? []} onNavigate={onNavigate} />

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
      <dd className="break-words text-sm font-medium leading-relaxed text-fg">{value || "—"}</dd>
    </div>
  );
}

function KpiCell({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <div className={`min-w-0 rounded-lg border px-3 py-3 ${tone === "primary" ? "border-primary/20 bg-primary-soft" : "border-border bg-surface-2"}`}>
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
                        {lot.allocations[0]?.receivingId ? (
                          <button type="button" className={`break-all text-left text-sm font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${lotColor(lot.lotNo).text}`} onClick={() => onNavigate({ type: "main-qr", id: lot.allocations[0].receivingId! })}>{lot.lotNo}</button>
                        ) : <span className={`text-sm font-semibold ${lotColor(lot.lotNo).text}`}>{lot.lotNo}</span>}
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
