"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { transferLotAction } from "@/app/(dashboard)/products/process-orders/actions";
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
import type { BoardStep, LineBoard } from "@/lib/api/production-lots";
import { currentProductionDay, formatThaiDate, type Shift } from "@/lib/production-day";
import { cn } from "@/lib/utils";
import { DayShiftFields } from "./day-shift-fields";
import type { ReverseTarget } from "./reverse-dialog";

/** FIFO preview: same rule as the API (oldest lot first). */
function fifoPreview(lots: BoardStep["lots"], qty: number) {
  let left = qty;
  return lots.map((lot) => {
    const take = Math.max(0, Math.min(left, lot.remainingQty));
    left -= take;
    return take;
  });
}

/**
 * "ส่งต่อ" from one step to the next: FIFO (oldest lot first) or MANUAL
 * (pick lots + quantities). Remounted per open by the parent (fresh requestId).
 */
export function TransferDialog({
  lineId,
  step,
  next,
  onClose,
  onDone,
  onUndo,
}: {
  lineId: string;
  step: BoardStep;
  next: BoardStep;
  onClose: () => void;
  onDone: (board: LineBoard) => void;
  /** Omitted when the user may not reverse: the toast then has no undo. */
  onUndo?: (target: ReverseTarget) => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const ready = step.lots
    .filter((l) => l.remainingQty > 0 && l.status === "OPEN")
    .sort((a, b) => (a.productionDate === b.productionDate ? Number(a.id) - Number(b.id) : a.productionDate < b.productionDate ? -1 : 1));
  const initialDay = currentProductionDay();
  const [mode, setMode] = useState<"FIFO" | "MANUAL">("FIFO");
  const [qty, setQty] = useState(String(step.readyQty));
  const [manual, setManual] = useState<Record<string, string>>({});
  const [date, setDate] = useState(initialDay.productionDate);
  const [shift, setShift] = useState<Shift>(initialDay.shift);
  const [saving, setSaving] = useState(false);

  const manualRows = ready.map((lot) => ({ lot, qty: Number(manual[lot.id] ?? 0) || 0 }));
  const manualTotal = manualRows.reduce((sum, r) => sum + r.qty, 0);
  const total = mode === "FIFO" ? Number(qty) || 0 : manualTotal;
  const preview = mode === "FIFO" ? fifoPreview(ready, total) : manualRows.map((r) => r.qty);
  const overLot = manualRows.some((r) => r.qty > r.lot.remainingQty || r.qty < 0);
  const over = total > step.readyQty;
  const valid = Number.isInteger(total) && total >= 1 && !over && (mode === "FIFO" || !overLot);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    const result = await transferLotAction(lineId, step.stepIndex, {
      requestId,
      qty: total,
      allocationMode: mode,
      allocations:
        mode === "MANUAL"
          ? manualRows.filter((r) => r.qty > 0).map((r) => ({ lotId: r.lot.id, qty: r.qty }))
          : undefined,
      transferDate: date,
      shift,
    });
    setSaving(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    const message = `ส่ง ${total} ชิ้น ${step.code} → ${next.code} (${result.result.transfers.map((t) => `${t.lotNo} ${t.qty}`).join(", ")})`;
    toast.success(message, {
      duration: 10000,
      action: onUndo
        ? { label: "กลับรายการ", onClick: () => onUndo({ lineId, requestId, label: message }) }
        : undefined,
    });
    onDone(result.board);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              ส่งต่อ {step.code} → {next.code} {next.name}
            </DialogTitle>
            <DialogDescription>
              ผลิตแล้วรอส่ง {step.readyQty.toLocaleString("th-TH")} ชิ้น · ชิ้นงานที่ยังไม่ส่งจะรออยู่ที่ {step.code}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-6">
            <div role="group" aria-label="วิธีเลือก Lot" className="inline-flex w-fit rounded-md border border-border-strong p-0.5">
              {(["FIFO", "MANUAL"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded px-3 py-1 text-sm font-medium",
                    mode === m ? "bg-primary-soft text-primary" : "text-fg-secondary hover:bg-surface-2",
                  )}
                >
                  {m === "FIFO" ? "Lot เก่าก่อน (FIFO)" : "เลือก Lot เอง"}
                </button>
              ))}
            </div>
            {mode === "FIFO" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tf-qty">จำนวนที่ส่ง (ชิ้น)</Label>
                <Input
                  id="tf-qty"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={step.readyQty}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs text-fg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Lot</th>
                    <th className="px-3 py-2 text-right font-medium">รอส่ง</th>
                    <th className="px-3 py-2 text-right font-medium">ส่งครั้งนี้</th>
                  </tr>
                </thead>
                <tbody>
                  {ready.map((lot, i) => (
                    <tr key={lot.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs">{lot.lotNo}</span>
                        <span className="ml-2 text-xs text-fg-muted">
                          {formatThaiDate(lot.productionDate)} กะ {lot.shift}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{lot.remainingQty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {mode === "FIFO" ? (
                          <span className={preview[i] ? "font-semibold text-fg" : "text-fg-muted"}>{preview[i]}</span>
                        ) : (
                          <Input
                            aria-label={`จำนวนส่งจาก ${lot.lotNo}`}
                            type="number"
                            min={0}
                            max={lot.remainingQty}
                            className="ml-auto h-8 w-20 text-right"
                            value={manual[lot.id] ?? ""}
                            onChange={(e) => setManual((m) => ({ ...m, [lot.id]: e.target.value }))}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DayShiftFields idPrefix="tf" date={date} shift={shift} onDate={setDate} onShift={setShift} />
            <p role={over || overLot ? "alert" : undefined} className={over || overLot ? "text-xs text-danger" : "text-xs text-fg-secondary"}>
              {over
                ? `เกินยอดรอส่ง (${step.readyQty} ชิ้น)`
                : overLot
                  ? "บาง Lot ใส่จำนวนเกินยอดรอส่งของ Lot นั้น"
                  : `ส่ง ${total} ชิ้น · ${next.code} จะมีงานรอผลิตเพิ่ม · ${step.code} เหลือรอส่ง ${step.readyQty - total} ชิ้น`}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              ยืนยันส่งต่อ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
