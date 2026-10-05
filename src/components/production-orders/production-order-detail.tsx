"use client";

import { Check, CheckCircle2, Loader2, Printer, Split, StepForward } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { advanceProductionOrderPacketAction } from "@/app/(dashboard)/products/process-orders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CloseRemainingResult,
  ProductionOrderDetail as ProductionOrderDetailData,
  ProductionOrderDetailLine,
  ProductionOrderPacket,
  ProductionOrderStep,
  RecordOutputResult,
} from "@/lib/api/production-orders";
import { ProductionOrderLineHold } from "./production-order-line-hold";

const PAGE_SIZE = 24;

const STATUS_FILTERS = [
  ["IN_PROGRESS", "กำลังผลิต"],
  ["COMPLETED", "เสร็จแล้ว"],
  ["all", "ทั้งหมด"],
] as const;

function PacketStatus({ packet }: { packet: ProductionOrderPacket }) {
  if (packet.status === "COMPLETED") {
    return <Badge variant="success">ผลิตเสร็จแล้ว</Badge>;
  }
  return (
    <Badge variant="info">
      ขั้นที่ {packet.currentStepIndex + 1}: {packet.currentStep?.name ?? "—"}
    </Badge>
  );
}

const dateTime = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatWhen(value: string) {
  return dateTime.format(new Date(value));
}

/**
 * Vertical workflow timeline for one packet: every step in order, marked
 * done / current / waiting, with when it started and finished and who moved
 * it on (from the packet's step-change events).
 */
function PacketTimeline({ packet, steps }: { packet: ProductionOrderPacket; steps: ProductionOrderStep[] }) {
  const reached = (index: number) => packet.timeline.find((e) => e.toStepIndex === index);
  const created = packet.timeline.find((e) => e.fromStepIndex === null);
  const finished = reached(steps.length);

  return (
    <ol className="mt-2 flex flex-col">
      {steps.map((step, i) => {
        const started = i === 0 ? created : reached(i);
        const done = reached(i + 1);
        const state = packet.currentStepIndex > i || packet.status === "COMPLETED"
          ? "done"
          : packet.currentStepIndex === i
            ? "current"
            : "waiting";
        return (
          <li key={step.index} className="relative flex gap-3 pb-3 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[7px] top-4 h-full w-px ${state === "done" ? "bg-success" : "bg-border"}`}
              />
            )}
            <span
              aria-hidden
              className={`relative z-10 mt-0.5 flex size-[15px] shrink-0 items-center justify-center rounded-full border-2 ${
                state === "done"
                  ? "border-success bg-success text-white"
                  : state === "current"
                    ? "border-primary bg-surface"
                    : "border-border-strong bg-surface"
              }`}
            >
              {state === "done" && <Check className="size-2.5" strokeWidth={3} />}
              {state === "current" && <span className="size-1.5 rounded-full bg-primary" />}
            </span>
            <div className="min-w-0 text-xs">
              <p className={state === "waiting" ? "text-fg-muted" : "font-medium text-fg"}>
                {i + 1}. {step.name}
                <span className="sr-only">
                  {state === "done" ? " (เสร็จแล้ว)" : state === "current" ? " (กำลังทำ)" : " (รอ)"}
                </span>
              </p>
              {started && state !== "waiting" && (
                <p className="text-fg-secondary">เริ่ม {formatWhen(started.performedAt)}</p>
              )}
              {done && (
                <p className="text-fg-secondary">
                  เสร็จ {formatWhen(done.performedAt)}
                  {done.performedBy ? ` · ${done.performedBy}` : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
      {finished && (
        <li className="flex gap-3 pt-1 text-xs font-medium text-success-fg">
          <CheckCircle2 className="size-[15px] shrink-0" aria-hidden />
          ผลิตเสร็จ {formatWhen(finished.performedAt)}
        </li>
      )}
    </ol>
  );
}

/**
 * Per-line overview in pieces: what is still on hold (not produced) at the
 * first step, what sits at each step in boxes, and what is finished.
 */
function StepProgress({ line }: { line: ProductionOrderDetailLine }) {
  const sum = (packets: ProductionOrderPacket[]) => packets.reduce((s, p) => s + p.quantity, 0);
  const done = line.packets.filter((p) => p.status === "COMPLETED");
  const completedQty = sum(done);
  const target = Math.max(0, line.quantity - line.shortClosedQuantity);
  const atStep = line.steps.map((_, i) =>
    line.packets.filter((p) => p.status !== "COMPLETED" && p.currentStepIndex === i),
  );
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-fg-secondary">
        <span>ความคืบหน้าตามขั้นตอน (ชิ้น)</span>
        <span className="font-medium text-fg">
          เสร็จ {completedQty}/{target} ชิ้น ({target ? Math.round((completedQty / target) * 100) : 0}%)
        </span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-border" aria-hidden>
        <div className="h-full rounded-full bg-success" style={{ width: `${target ? (completedQty / target) * 100 : 0}%` }} />
      </div>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="จำนวนในแต่ละขั้นตอน">
        {line.steps.map((step, i) => {
          const boxes = atStep[i];
          const hold = i === 0 ? line.remainingQuantity : 0;
          return (
            <li key={step.index} className="flex items-center gap-1.5">
              <span className="rounded-md border border-border bg-surface px-2 py-1">
                <span className="text-fg-secondary">
                  {i + 1}. {step.name}
                </span>{" "}
                <span className="font-semibold text-fg">{sum(boxes) + hold}</span>
                <span className="text-fg-muted">
                  {" "}
                  ชิ้น
                  {boxes.length > 0 && ` · ${boxes.length} กล่อง`}
                  {hold > 0 && ` · ค้างผลิต ${hold}`}
                </span>
              </span>
              <span aria-hidden className="text-fg-muted">→</span>
            </li>
          );
        })}
        <li className="rounded-md border border-success/40 bg-success-soft px-2 py-1 text-success-fg">
          เสร็จ <span className="font-semibold">{completedQty}</span> ชิ้น · {done.length} กล่อง
        </li>
      </ol>
    </div>
  );
}

/**
 * Client body of `/products/process-orders/[id]` (full page, not a dialog —
 * meant to stay open on a shop-floor tablet). Server passes the order in;
 * advancing a packet swaps in the fresh order returned by the action.
 * Hundreds of packets: filter + incremental paging, and the search box
 * doubles as a keyboard-wedge scanner input (QR text + Enter → advance).
 */
export function ProductionOrderDetail({
  initialOrder,
  canAdvance,
}: {
  initialOrder: ProductionOrderDetailData;
  canAdvance: boolean;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  /** null = not printing; "all" = every box; or one output's / one box's QR. */
  const [printing, setPrinting] = useState<
    null | "all" | { outputId: string } | { packetId: string }
  >(null);
  /** Box whose "ส่งต่อบางส่วน" form is open, and the quantity typed in it. */
  const [partialFor, setPartialFor] = useState<string | null>(null);
  const [partialQty, setPartialQty] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "IN_PROGRESS" | "COMPLETED">("IN_PROGRESS");
  const [visible, setVisible] = useState(PAGE_SIZE);

  function matches(packet: ProductionOrderPacket) {
    if (statusFilter !== "all" && packet.status !== statusFilter) return false;
    const q = query.trim().toUpperCase();
    return !q || packet.qrCode.toUpperCase().includes(q);
  }

  /**
   * Move a box on. `quantity` below the box quantity = only that part was
   * produced at this step: it is split into a new box (new QR) that moves
   * on, and the rest stays held at this step with the original QR.
   */
  async function advance(packetId: string, quantity?: number) {
    setAdvancingId(packetId);
    const result = await advanceProductionOrderPacketAction(packetId, quantity);
    setAdvancingId(null);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    // Patch only the changed box (+ append a split-off box) and counters —
    // no full-order reload per click.
    const { packet: changed, newPacket, orderStatus, packetCount, completedPacketCount } =
      result.result;
    setOrder((prev) => ({
      ...prev,
      status: orderStatus,
      packetCount,
      completedPacketCount,
      lines: prev.lines.map((line) => {
        const owns = line.packets.some((p) => p.id === changed.id);
        const packets = line.packets.map((p) => (p.id === changed.id ? { ...p, ...changed } : p));
        return { ...line, packets: owns && newPacket ? [...packets, newPacket] : packets };
      }),
    }));
    setPartialFor(null);
    setPartialQty("");
    if (newPacket) {
      toast.success(
        `ส่งต่อ ${newPacket.quantity} ชิ้นเป็นกล่องใหม่ ${newPacket.qrCode} · ค้างที่ขั้นตอนเดิม ${changed.quantity} ชิ้น`,
        { action: { label: "พิมพ์ QR", onClick: () => setPrinting({ packetId: newPacket.id }) } },
      );
    } else {
      toast.success(changed.status === "COMPLETED" ? "กล่องนี้ผลิตเสร็จแล้ว" : "เลื่อนขั้นตอนแล้ว");
    }
  }

  // Output report → append its new boxes + patch the line's hold counters.
  function handleRecorded(result: RecordOutputResult) {
    setOrder((prev) => ({
      ...prev,
      status: result.orderStatus,
      packetCount: result.packetCount,
      completedPacketCount: result.completedPacketCount,
      lines: prev.lines.map((line) =>
        line.id === result.line.id
          ? {
              ...line,
              ...result.line,
              outputs: [result.output, ...line.outputs],
              packets: [...line.packets, ...result.packets],
            }
          : line,
      ),
    }));
    setStatusFilter("IN_PROGRESS");
  }

  function handleClosed(result: CloseRemainingResult) {
    setOrder((prev) => ({
      ...prev,
      status: result.orderStatus,
      packetCount: result.packetCount,
      completedPacketCount: result.completedPacketCount,
      lines: prev.lines.map((line) =>
        line.id === result.line.id
          ? {
              ...line,
              ...result.line,
              shortCloseReason: result.line.shortCloseReason ?? line.shortCloseReason,
              shortClosedAt: result.line.shortClosedAt ?? line.shortClosedAt,
            }
          : line,
      ),
    }));
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!canAdvance) return;
    const code = query.trim().toUpperCase();
    if (!code) return;
    const packet = order.lines.flatMap((l) => l.packets).find((p) => p.qrCode.toUpperCase() === code);
    if (!packet) {
      toast.error(`ไม่พบกล่อง ${query.trim()} ในใบสั่งผลิตนี้`);
      return;
    }
    if (packet.status === "COMPLETED") {
      toast.info(`${packet.qrCode} ผลิตเสร็จแล้ว`);
      return;
    }
    await advance(packet.id);
    setQuery("");
  }

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done);
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-semibold text-fg">ใบสั่งผลิต {order.code}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            แผน {order.planCode ?? "—"} · ผลิตเสร็จ {order.completedPacketCount}/{order.packetCount} กล่อง
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.status === "COMPLETED" ? (
            <Badge variant="success">ผลิตเสร็จแล้ว</Badge>
          ) : (
            <Badge variant="info">กำลังผลิต</Badge>
          )}
          <Button variant="outline" disabled={order.packetCount === 0} onClick={() => setPrinting("all")}>
            <Printer className="size-4" />
            พิมพ์ QR ทั้งหมด
          </Button>
        </div>
      </div>

      <form onSubmit={handleScan} className="flex flex-wrap items-center gap-2">
        <label htmlFor="packet-scan" className="sr-only">
          ค้นหาหรือสแกน QR ของกล่อง
        </label>
        <Input
          id="packet-scan"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder={canAdvance ? "สแกน QR แล้วกด Enter เพื่อเลื่อนขั้นตอน หรือพิมพ์ค้นหา" : "ค้นหารหัส QR"}
          className="h-10 min-w-0 flex-1 font-mono sm:max-w-md"
          autoComplete="off"
        />
        <div role="group" aria-label="กรองตามสถานะ" className="flex rounded-md border border-border p-0.5">
          {STATUS_FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={statusFilter === value}
              onClick={() => {
                setStatusFilter(value);
                setVisible(PAGE_SIZE);
              }}
              className={
                statusFilter === value
                  ? "rounded bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary"
                  : "rounded px-3 py-1.5 text-sm text-fg-secondary hover:bg-surface-2"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </form>

      {order.lines.map((line) => {
        const filtered = line.packets.filter(matches);
        return (
          <section key={line.id} className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold text-fg">
                <span className="font-mono text-fg-secondary">{line.product.code}</span> {line.product.name}
              </h2>
              <p className="text-sm text-fg-muted">
                แผน {line.quantity} ชิ้น · กล่องละ {line.packingQuantity} · สร้างแล้ว {line.packets.length} กล่อง
              </p>
            </div>
            <ProductionOrderLineHold
              line={line}
              canRecord={canAdvance && order.status !== "COMPLETED"}
              onRecorded={handleRecorded}
              onClosed={handleClosed}
              onPrintOutput={(outputId) => setPrinting({ outputId })}
            />
            <StepProgress line={line} />

            {filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-fg-muted">
                {line.packets.length === 0
                  ? "ยังไม่มีกล่อง — บันทึกผลผลิตที่ขั้นตอนแรกเพื่อสร้างกล่องและ QR"
                  : "ไม่มีกล่องที่ตรงกับเงื่อนไข"}
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.slice(0, visible).map((packet) => (
                  <li key={packet.id} className="flex gap-3 rounded-lg border border-border bg-surface p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={packet.qrImage}
                      alt={`QR Code ${packet.qrCode}`}
                      className="size-24 shrink-0 rounded border border-border bg-white"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <p className="truncate font-mono text-xs text-fg-secondary">{packet.qrCode}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-sm text-fg">
                        กล่อง {packet.packetNo} · <span className="font-semibold">{packet.quantity}</span> ชิ้น
                        {packet.unitType === "PARTIAL" && <Badge variant="warning">กล่องเศษ</Badge>}
                      </p>
                      {packet.parentPacketId && (
                        <p className="text-xs text-fg-secondary">
                          แยกจากกล่อง{" "}
                          {line.packets.find((p) => p.id === packet.parentPacketId)?.packetNo ?? "—"}
                        </p>
                      )}
                      <PacketStatus packet={packet} />
                      <details className="group">
                        <summary className="cursor-pointer select-none text-xs font-medium text-primary hover:underline">
                          ดู timeline
                        </summary>
                        <PacketTimeline packet={packet} steps={line.steps} />
                      </details>
                      {canAdvance && packet.status !== "COMPLETED" && (
                        <div className="mt-auto flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={advancingId === packet.id}
                            onClick={() => void advance(packet.id)}
                          >
                            {advancingId === packet.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <StepForward className="size-4" />
                            )}
                            ไปขั้นตอนถัดไป
                          </Button>
                          {packet.quantity > 1 && partialFor !== packet.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={advancingId === packet.id}
                              onClick={() => {
                                setPartialFor(packet.id);
                                setPartialQty("");
                              }}
                            >
                              <Split className="size-4" />
                              ส่งต่อบางส่วน
                            </Button>
                          )}
                        </div>
                      )}
                      {canAdvance && partialFor === packet.id && (
                        <PartialAdvanceForm
                          packet={packet}
                          nextStepName={
                            line.steps[packet.currentStepIndex + 1]?.name ?? "ปิดงาน"
                          }
                          value={partialQty}
                          onChange={setPartialQty}
                          busy={advancingId === packet.id}
                          onCancel={() => setPartialFor(null)}
                          onSubmit={(qty) => void advance(packet.id, qty)}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {filtered.length > visible && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  แสดงเพิ่ม ({filtered.length - visible} กล่องที่เหลือ)
                </Button>
              </div>
            )}
          </section>
        );
      })}

      {printing && (
        <PrintSheet
          order={order}
          include={(p) =>
            printing === "all"
              ? true
              : "outputId" in printing
                ? p.outputId === printing.outputId
                : p.id === printing.packetId
          }
        />
      )}
    </div>
  );
}

/**
 * Downstream line hold: only part of a box was produced at this step. The
 * typed quantity becomes a new box (new QR) for the next step; the rest stays
 * here under the box's current QR, to be produced later.
 */
function PartialAdvanceForm({
  packet,
  nextStepName,
  value,
  onChange,
  busy,
  onCancel,
  onSubmit,
}: {
  packet: ProductionOrderPacket;
  nextStepName: string;
  value: string;
  onChange: (value: string) => void;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (quantity: number) => void;
}) {
  const qty = Number(value);
  const valid = Number.isInteger(qty) && qty >= 1 && qty < packet.quantity;
  const id = `partial-${packet.id}`;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !busy) onSubmit(qty);
      }}
      className="flex flex-col gap-1.5 rounded-md border border-primary/30 bg-primary-soft/40 p-2"
    >
      <label htmlFor={id} className="text-xs font-medium text-fg">
        ผลิตเสร็จที่ขั้นตอนนี้กี่ชิ้น (จาก {packet.quantity})
      </label>
      <div className="flex gap-1.5">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={packet.quantity - 1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-20"
          aria-describedby={`${id}-hint`}
          autoFocus
        />
        <Button type="submit" size="sm" disabled={!valid || busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          ส่งต่อ
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          ยกเลิก
        </Button>
      </div>
      <p id={`${id}-hint`} className="text-xs text-fg-secondary">
        {valid
          ? `สร้างกล่องใหม่ ${qty} ชิ้นไป ${nextStepName} · ค้างที่ขั้นตอนนี้ ${packet.quantity - qty} ชิ้น (QR เดิม)`
          : `ใส่ 1–${packet.quantity - 1} ชิ้น · ถ้าเสร็จทั้งกล่องใช้ "ไปขั้นตอนถัดไป"`}
      </p>
    </form>
  );
}

// Print-only overlay (same "print the current document, no window.open()"
// technique as materials-receiving-qr-print-sheet.tsx; #dashboard-shell is
// hidden under @media print in globals.css).
function PrintSheet({
  order,
  include,
}: {
  order: ProductionOrderDetailData;
  include: (packet: ProductionOrderPacket) => boolean;
}) {
  return createPortal(
    <div className="hidden print:block">
      <div className="grid grid-cols-3 gap-3 p-4">
        {order.lines.flatMap((line) =>
          line.packets.filter(include).map((packet) => (
            <div
              key={packet.id}
              className="flex flex-col items-center gap-1 border border-black p-2 text-center text-xs text-black"
              style={{ breakInside: "avoid" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={packet.qrImage} alt="" className="size-32" />
              <p className="font-mono">{packet.qrCode}</p>
              <p>
                {line.product.code} · {line.product.name}
              </p>
              <p>
                กล่อง {packet.packetNo} · {packet.quantity} ชิ้น{packet.unitType === "PARTIAL" ? " (เศษ)" : ""}
              </p>
            </div>
          )),
        )}
      </div>
    </div>,
    document.body,
  );
}
