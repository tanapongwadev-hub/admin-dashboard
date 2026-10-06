"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { checkStepBoxAction, getAllocationPreviewAction, nextStepBoxAction, produceLotAction } from "@/app/(dashboard)/products/process-orders/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AllocationPreview, BoardStep, BoxCheck, LineBoard, StepTag } from "@/lib/api/production-lots";
import { currentProductionDay, formatThaiDate, type Shift } from "@/lib/production-day";
import { cn } from "@/lib/utils";
import { DayShiftFields } from "./day-shift-fields";
import type { ReverseTarget } from "./reverse-dialog";

/** FIFO split of `qty` across source lots (already oldest first). */
function splitFifo(sources: AllocationPreview["sources"], qty: number): number[] {
  let left = qty;
  return sources.map((s) => {
    const take = Math.max(0, Math.min(left, s.waitingQty));
    left -= take;
    return take;
  });
}

export interface RejectReasonOption {
  id: string;
  code: string;
  nameTh: string;
}

/**
 * "บันทึกผลิต" at one step: good pieces + optional rejects (reason each),
 * drawn FIFO from the step's waiting WIP. Plain controlled state (dynamic
 * reject rows), like the job-order issue dialog. The parent remounts it per
 * open (key) so the requestId — the idempotency key — is fresh each time.
 */
export function ProduceDialog({
  lineId,
  step,
  rejectReasons,
  onClose,
  onDone,
  onUndo,
}: {
  lineId: string;
  step: BoardStep;
  rejectReasons: RejectReasonOption[];
  onClose: () => void;
  /** `splits`: boxes this record split — their new QR labels to print. */
  onDone: (board: LineBoard, splits: StepTag[]) => void;
  /** Omitted when the user may not reverse: the toast then has no undo. */
  onUndo?: (target: ReverseTarget) => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const initialDay = currentProductionDay();
  const canPick = step.stepIndex > 0;
  const [mode, setMode] = useState<"FIFO" | "MANUAL" | "BOXES">("FIFO");
  const [scanned, setScanned] = useState<BoxCheck[]>([]);
  const [scanCode, setScanCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [expected, setExpected] = useState<BoxCheck | null | undefined>(undefined);
  const [picks, setPicks] = useState<Record<string, string>>({});
  // null = loading; fetched once per open (the dialog remounts per open).
  const [preview, setPreview] = useState<AllocationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  useEffect(() => {
    if (!canPick) return;
    let alive = true;
    getAllocationPreviewAction(lineId, step.stepIndex).then((r) => {
      if (!alive) return;
      if (r.status === "success") setPreview(r.preview);
      else setPreviewError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [canPick, lineId, step.stepIndex]);
  const [good, setGood] = useState("");
  const [date, setDate] = useState(initialDay.productionDate);
  const [shift, setShift] = useState<Shift>(initialDay.shift);
  const [rejects, setRejects] = useState<Array<{ key: number; reasonId: string; qty: string }>>([]);
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);

  const sources = preview?.sources ?? [];
  const pickRows = sources.map((s) => ({ source: s, qty: Number(picks[s.lotId] ?? 0) || 0 }));
  const pickOver = pickRows.some((r) => r.qty < 0 || r.qty > r.source.waitingQty || !Number.isInteger(r.qty));
  const manual = mode === "MANUAL";
  const byBoxes = mode === "BOXES";
  const boxesLeft = scanned.reduce((sum, b) => sum + b.left, 0);
  const goodQty = manual ? pickRows.reduce((sum, r) => sum + r.qty, 0) : Number(good) || 0;
  // FIFO split of the good pieces across source lots, for display only — the
  // server draws the real split (rejects come after good pieces).
  const fifoSplit = splitFifo(sources, goodQty);
  const rejectRows = rejects.map((r) => ({ reasonId: r.reasonId, qty: Number(r.qty) || 0 }));
  const rejectTotal = rejectRows.reduce((sum, r) => sum + r.qty, 0);
  const total = goodQty + rejectTotal;
  const over = total > (byBoxes ? boxesLeft : step.waitingQty);
  const rejectsValid = rejectRows.every((r) => r.reasonId && Number.isInteger(r.qty) && r.qty > 0);
  const valid =
    Number.isInteger(goodQty) &&
    goodQty >= 0 &&
    total >= 1 &&
    !over &&
    rejectsValid &&
    (!manual || (goodQty >= 1 && !pickOver)) &&
    (!byBoxes || scanned.length > 0);
  const isFirst = step.stepIndex === 0;
  const isReceiving = step.receivingType !== "NONE";

  function setGoodFor(boxes: BoxCheck[]) {
    // Default: produce everything in the scanned boxes, minus the scrap.
    const left = boxes.reduce((sum, b) => sum + b.left, 0);
    setGood(String(Math.max(0, left - rejectTotal)));
  }

  async function addBox() {
    const code = scanCode.trim();
    if (!code || scanning) return;
    if (scanned.some((b) => b.qrCode === code.toUpperCase())) {
      toast.error("สแกนกล่องนี้แล้ว");
      setScanCode("");
      return;
    }
    setScanning(true);
    const r = await checkStepBoxAction(
      lineId,
      step.stepIndex,
      code,
      scanned.map((b) => b.qrCode),
    );
    setScanning(false);
    setScanCode("");
    if (r.status === "error") {
      toast.error(r.message);
      return;
    }
    const next = [...scanned, r.box];
    setScanned(next);
    setGoodFor(next);
    void loadExpected(next);
  }

  async function loadExpected(boxes: BoxCheck[]) {
    const r = await nextStepBoxAction(
      lineId,
      step.stepIndex,
      boxes.map((b) => b.qrCode),
    );
    setExpected(r.status === "success" ? r.box : undefined);
  }

  function removeBox(qrCode: string) {
    // FIFO: only the last scanned box can be taken back.
    const next = scanned.filter((b) => b.qrCode !== qrCode);
    setScanned(next);
    setGoodFor(next);
    void loadExpected(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    const result = await produceLotAction(lineId, step.stepIndex, {
      requestId,
      goodQty,
      rejects: rejectRows.length ? rejectRows : undefined,
      ...(byBoxes ? { boxes: scanned.map((b) => b.qrCode) } : {}),
      ...(manual
        ? {
            allocationMode: "MANUAL" as const,
            allocations: pickRows.filter((r) => r.qty > 0).map((r) => ({ lotId: r.source.lotId, qty: r.qty })),
          }
        : {}),
      productionDate: date,
      shift,
      remark: remark.trim() || undefined,
    });
    setSaving(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    const lot = result.result.lot;
    const message = lot
      ? `${isReceiving ? "รับเข้า" : "บันทึกผลิต"} ${goodQty} ชิ้น → ${lot.lotNo}${lot.isNew ? " (Lot ใหม่)" : ""}${rejectTotal ? ` · ของเสีย ${rejectTotal}` : ""}`
      : `บันทึกของเสีย ${rejectTotal} ชิ้น`;
    toast.success(message, {
      duration: 10000,
      action: onUndo
        ? { label: "กลับรายการ", onClick: () => onUndo({ lineId, requestId, label: message }) }
        : undefined,
    });
    onDone(result.board, result.result.splits ?? []);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {isReceiving ? "รับเข้า" : "บันทึกผลิต"} · {step.code} {step.name}
            </DialogTitle>
            <DialogDescription>
              รอ{isReceiving ? "รับเข้า" : "ผลิต"} {step.waitingQty.toLocaleString("th-TH")} ชิ้น · ดึงงานที่รอนานสุดก่อน (FIFO) ·
              บันทึกหลายครั้งในกะเดียวรวมเข้า Lot เดียวกัน
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {canPick && (
              <div role="group" aria-label="วิธีเลือก Lot ต้นทาง" className="inline-flex w-fit rounded-md border border-border-strong p-0.5">
                {(["FIFO", "MANUAL", "BOXES"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => {
                      setMode(m);
                      if (m === "BOXES") void loadExpected(scanned);
                    }}
                    className={cn(
                      "rounded px-3 py-1 text-sm font-medium",
                      mode === m ? "bg-primary-soft text-primary" : "text-fg-secondary hover:bg-surface-2",
                    )}
                  >
                    {m === "FIFO" ? "Lot เก่าก่อน (FIFO)" : m === "MANUAL" ? "เลือก Lot ต้นทางเอง" : "สแกนกล่อง"}
                  </button>
                ))}
              </div>
            )}
            {manual ? (
              <p className="text-sm text-fg-secondary">
                จำนวนดี <span className="font-semibold tabular-nums text-fg">{goodQty}</span> ชิ้น (รวมจากที่เลือกด้านล่าง)
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pd-good">จำนวนดี (ชิ้น)</Label>
                <Input
                  id="pd-good"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={step.waitingQty}
                  value={good}
                  onChange={(e) => setGood(e.target.value)}
                  aria-describedby="pd-hint"
                  autoFocus
                />
              </div>
            )}
            {byBoxes && (
              <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                <Label htmlFor="pd-scan">สแกน QR กล่องที่จะผลิต</Label>
                <div className="flex gap-2">
                  <Input
                    id="pd-scan"
                    value={scanCode}
                    placeholder="TQ-…-B001"
                    autoComplete="off"
                    onChange={(e) => setScanCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addBox();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => void addBox()} disabled={scanning || !scanCode.trim()}>
                    {scanning ? <Loader2 className="size-4 animate-spin" /> : "เพิ่ม"}
                  </Button>
                </div>
                {scanned.length === 0 ? (
                  <p className="text-xs text-fg-muted">ยังไม่ได้สแกนกล่อง — ใช้เครื่องสแกนยิงที่ช่องนี้ หรือพิมพ์รหัสแล้วกด Enter</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {scanned.map((b) => (
                      <li key={b.qrCode} className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs">
                        <span className="min-w-0 flex-1 truncate font-mono">{b.qrCode}</span>
                        <span className="text-fg-secondary">
                          กล่อง {b.boxNo}/{b.boxCount} · เหลือ {b.left}/{b.qty}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5"
                          onClick={() => removeBox(b.qrCode)}
                        >
                          เอาออก
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {expected === null ? (
                  <p className="text-xs text-fg-muted">ไม่มีกล่องถัดไปที่รอผลิต</p>
                ) : expected ? (
                  <p className="text-xs text-primary">
                    กล่องถัดไป (FIFO): <span className="font-mono font-semibold">{expected.qrCode}</span> · เหลือ {expected.left} ชิ้น
                  </p>
                ) : null}
                <p className="text-xs text-fg-secondary">
                  ชิ้นงานในกล่องที่สแกน {boxesLeft} ชิ้น — จำนวนดี + ของเสียต้องไม่เกินนี้
                </p>
              </div>
            )}
            {canPick && !byBoxes && (
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <caption className="sr-only">Lot ต้นทางที่รอผลิตที่ {step.code}</caption>
                  <thead className="bg-surface-2 text-xs text-fg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Lot ต้นทาง</th>
                      <th className="px-3 py-2 text-right font-medium">รอผลิต</th>
                      <th className="px-3 py-2 text-right font-medium">{manual ? "ใช้ครั้งนี้" : "ใช้ (ประมาณ)"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!preview && !previewError && (
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-center text-xs text-fg-muted">
                          <Loader2 className="mr-1 inline size-3.5 animate-spin" /> กำลังโหลด Lot ต้นทาง…
                        </td>
                      </tr>
                    )}
                    {previewError && (
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-xs text-danger">
                          {previewError}
                        </td>
                      </tr>
                    )}
                    {pickRows.map(({ source }, i) => (
                      <tr key={source.lotId} className="border-t border-border align-top">
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs font-medium">{source.lotNo}</span>
                          <span className="ml-2 text-xs text-fg-muted">
                            {formatThaiDate(source.productionDate)} กะ {source.shift}
                          </span>
                          {source.origins.some((o) => o.lotNo !== source.lotNo) && (
                            <p className="text-[11px] text-fg-muted">
                              ต้นทาง {source.origins.map((o) => `${o.lotNo} ${o.qty}`).join(", ")}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{source.waitingQty}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {manual ? (
                            <Input
                              aria-label={`จำนวนที่ใช้จาก ${source.lotNo}`}
                              type="number"
                              min={0}
                              max={source.waitingQty}
                              className="ml-auto h-8 w-20 text-right"
                              value={picks[source.lotId] ?? ""}
                              onChange={(e) => setPicks((p) => ({ ...p, [source.lotId]: e.target.value }))}
                            />
                          ) : (
                            <span className={fifoSplit[i] ? "font-semibold text-fg" : "text-fg-muted"}>{fifoSplit[i]}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {manual && pickOver && (
              <p role="alert" className="text-xs text-danger">
                บาง Lot ใส่จำนวนเกินที่รอผลิตของ Lot นั้น
              </p>
            )}
            <DayShiftFields idPrefix="pd" date={date} shift={shift} onDate={setDate} onShift={setShift} />

            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-fg">ของเสีย</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!rejectReasons.length}
                  onClick={() =>
                    setRejects((rows) => [...rows, { key: Date.now(), reasonId: rejectReasons[0]?.id ?? "", qty: "" }])
                  }
                >
                  <Plus className="size-4" /> เพิ่มของเสีย
                </Button>
              </div>
              {!rejectReasons.length && (
                <p className="text-xs text-fg-muted">ยังไม่มีเหตุผลของเสียในข้อมูลหลัก — เพิ่มได้ที่ ข้อมูลหลัก › เหตุผลการปฏิเสธ</p>
              )}
              {rejects.map((row, i) => (
                <div key={row.key} className="flex items-end gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Label htmlFor={`pd-rr-${row.key}`} className="sr-only">
                      เหตุผลของเสีย {i + 1}
                    </Label>
                    <select
                      id={`pd-rr-${row.key}`}
                      value={row.reasonId}
                      onChange={(e) =>
                        setRejects((rows) => rows.map((r) => (r.key === row.key ? { ...r, reasonId: e.target.value } : r)))
                      }
                      className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-fg"
                    >
                      {rejectReasons.map((reason) => (
                        <option key={reason.id} value={reason.id}>
                          {reason.code} · {reason.nameTh}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    aria-label={`จำนวนของเสีย ${i + 1}`}
                    type="number"
                    min={1}
                    className="w-24"
                    value={row.qty}
                    onChange={(e) =>
                      setRejects((rows) => rows.map((r) => (r.key === row.key ? { ...r, qty: e.target.value } : r)))
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`ลบของเสีย ${i + 1}`}
                    onClick={() => setRejects((rows) => rows.filter((r) => r.key !== row.key))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pd-remark">หมายเหตุ (ไม่บังคับ)</Label>
              <Input id="pd-remark" value={remark} maxLength={500} onChange={(e) => setRemark(e.target.value)} />
            </div>
            <p id="pd-hint" role={over ? "alert" : undefined} className={over ? "text-xs text-danger" : "text-xs text-fg-secondary"}>
              {over
                ? `รวม ${total} ชิ้น เกินงานที่รอ (${step.waitingQty} ชิ้น)`
                : total
                  ? `ใช้งานที่รอ ${total} ชิ้น · เหลือรอ ${step.waitingQty - total} ชิ้น${isFirst ? " · ได้ Lot ต้นทาง (Origin)" : ""}`
                  : "ใส่จำนวนดี และ/หรือ ของเสีย อย่างน้อย 1 ชิ้น"}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              ยืนยันบันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
