"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { produceLotAction } from "@/app/(dashboard)/products/process-orders/actions";
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
import { currentProductionDay, type Shift } from "@/lib/production-day";
import { DayShiftFields } from "./day-shift-fields";

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
}: {
  lineId: string;
  step: BoardStep;
  rejectReasons: RejectReasonOption[];
  onClose: () => void;
  onDone: (board: LineBoard) => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const initialDay = currentProductionDay();
  const [good, setGood] = useState("");
  const [date, setDate] = useState(initialDay.productionDate);
  const [shift, setShift] = useState<Shift>(initialDay.shift);
  const [rejects, setRejects] = useState<Array<{ key: number; reasonId: string; qty: string }>>([]);
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);

  const goodQty = Number(good) || 0;
  const rejectRows = rejects.map((r) => ({ reasonId: r.reasonId, qty: Number(r.qty) || 0 }));
  const rejectTotal = rejectRows.reduce((sum, r) => sum + r.qty, 0);
  const total = goodQty + rejectTotal;
  const over = total > step.waitingQty;
  const rejectsValid = rejectRows.every((r) => r.reasonId && Number.isInteger(r.qty) && r.qty > 0);
  const valid = Number.isInteger(goodQty) && goodQty >= 0 && total >= 1 && !over && rejectsValid;
  const isFirst = step.stepIndex === 0;
  const isReceiving = step.receivingType !== "NONE";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    const result = await produceLotAction(lineId, step.stepIndex, {
      requestId,
      goodQty,
      rejects: rejectRows.length ? rejectRows : undefined,
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
    toast.success(
      lot
        ? `${isReceiving ? "รับเข้า" : "บันทึกผลิต"} ${goodQty} ชิ้น → ${lot.lotNo}${lot.isNew ? " (Lot ใหม่)" : ""}${rejectTotal ? ` · ของเสีย ${rejectTotal}` : ""}`
        : `บันทึกของเสีย ${rejectTotal} ชิ้น`,
    );
    onDone(result.board);
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
          <div className="flex flex-col gap-3 px-6">
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
