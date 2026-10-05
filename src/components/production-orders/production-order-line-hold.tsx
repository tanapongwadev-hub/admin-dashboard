"use client";

import { Loader2, PackagePlus, Printer, XCircle } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  closeProductionOrderRemainingAction,
  recordProductionOrderOutputAction,
} from "@/app/(dashboard)/products/process-orders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CloseRemainingResult,
  ProductionOrderDetailLine,
  RecordOutputResult,
} from "@/lib/api/production-orders";

/** Today on the factory clock (Asia/Bangkok), YYYY-MM-DD. */
function bangkokToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

const workDateFormat = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" });

/** Same split rule as the API: full boxes of `packing` + one remainder box. */
export function splitIntoBoxes(quantity: number, packing: number) {
  if (!Number.isInteger(quantity) || quantity <= 0 || packing <= 0) return { full: 0, rest: 0 };
  const full = Math.floor(quantity / packing);
  return { full, rest: quantity - full * packing };
}

/**
 * Line hold at the first workflow step: plan vs produced vs closed vs still
 * on hold, the "บันทึกผลผลิต" form (boxes + QR are created only here, from
 * real output), "ปิดยอดค้าง", and the per-day output history.
 */
export function ProductionOrderLineHold({
  line,
  canRecord,
  onRecorded,
  onClosed,
  onPrintOutput,
}: {
  line: ProductionOrderDetailLine;
  canRecord: boolean;
  onRecorded: (result: RecordOutputResult) => void;
  onClosed: (result: CloseRemainingResult) => void;
  onPrintOutput: (outputId: string) => void;
}) {
  const id = `line-${line.id}`;
  const firstStep = line.steps[0]?.name ?? "ขั้นตอนแรก";
  const nextStep = line.steps[1]?.name;
  const [quantity, setQuantity] = useState("");
  const [workDate, setWorkDate] = useState(bangkokToday);
  const [shift, setShift] = useState("");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reason, setReason] = useState("");

  const qty = Number(quantity);
  const overHold = qty > line.remainingQuantity;
  const qtyValid = Number.isInteger(qty) && qty > 0 && !overHold;
  const { full, rest } = splitIntoBoxes(qtyValid ? qty : 0, line.packingQuantity);
  const today = bangkokToday();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!qtyValid || saving) return;
    setSaving(true);
    const result = await recordProductionOrderOutputAction(line.id, {
      quantity: qty,
      workDate,
      shift: shift.trim() || undefined,
      remark: remark.trim() || undefined,
    });
    setSaving(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    onRecorded(result.result);
    setQuantity("");
    setRemark("");
    toast.success(
      `บันทึกผลผลิต ${qty} ชิ้น สร้าง ${result.result.packets.length} กล่องแล้ว · ค้าง ${result.result.line.remainingQuantity} ชิ้น`,
    );
  }

  async function closeRemaining(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || closing) return;
    setClosing(true);
    const result = await closeProductionOrderRemainingAction(line.id, reason.trim());
    setClosing(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    onClosed(result.result);
    setCloseOpen(false);
    setReason("");
    toast.success("ปิดยอดค้างแล้ว");
  }

  const stats = [
    ["แผนผลิต", line.quantity, "text-fg"],
    ["ผลิตแล้ว", line.producedQuantity, "text-success-fg"],
    ["ปิดยอดค้าง", line.shortClosedQuantity, "text-fg-secondary"],
    [`ค้างที่ ${firstStep}`, line.remainingQuantity, line.remainingQuantity > 0 ? "text-warning-fg" : "text-fg"],
  ] as const;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([label, value, tone]) => (
          <div key={label} className="rounded-md bg-surface-2/60 px-3 py-2">
            <dt className="truncate text-xs text-fg-secondary">{label}</dt>
            <dd className={`text-lg font-semibold tabular-nums ${tone}`}>
              {value.toLocaleString("th-TH")} <span className="text-xs font-normal text-fg-muted">ชิ้น</span>
            </dd>
          </div>
        ))}
      </dl>

      {line.shortClosedQuantity > 0 && line.shortCloseReason && (
        <p className="text-xs text-fg-secondary">เหตุผลที่ปิดยอดค้าง: {line.shortCloseReason}</p>
      )}

      {canRecord && line.remainingQuantity > 0 && (
        <form onSubmit={submit} className="flex flex-col gap-3 border-t border-border pt-3">
          <p className="text-sm font-medium text-fg">
            บันทึกผลผลิตที่ {firstStep}
            <span className="font-normal text-fg-muted"> — QR จะสร้างจากจำนวนที่ผลิตจริงเท่านั้น</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-[8rem_10rem_8rem_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-qty`}>จำนวนที่ผลิตได้</Label>
              <Input
                id={`${id}-qty`}
                type="number"
                inputMode="numeric"
                min={1}
                max={line.remainingQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-invalid={overHold || undefined}
                aria-describedby={`${id}-qty-hint`}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-date`}>วันที่ผลิต</Label>
              <Input
                id={`${id}-date`}
                type="date"
                max={today}
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value || today)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-shift`}>กะ (ไม่บังคับ)</Label>
              <Input
                id={`${id}-shift`}
                value={shift}
                maxLength={20}
                placeholder="เช่น A, เช้า"
                onChange={(e) => setShift(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-remark`}>หมายเหตุ (ไม่บังคับ)</Label>
              <Input
                id={`${id}-remark`}
                value={remark}
                maxLength={500}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          </div>
          <p id={`${id}-qty-hint`} className={`text-xs ${overHold ? "text-danger" : "text-fg-secondary"}`} role={overHold ? "alert" : undefined}>
            {overHold
              ? `เกินยอดค้าง — บันทึกได้ไม่เกิน ${line.remainingQuantity} ชิ้น`
              : qtyValid
                ? `จะได้ ${full > 0 ? `${full} กล่องเต็ม (กล่องละ ${line.packingQuantity})` : ""}${full > 0 && rest > 0 ? " + " : ""}${rest > 0 ? `1 กล่องเศษ ${rest} ชิ้น` : ""} ส่งต่อ${nextStep ? `ไป ${nextStep}` : "ปิดงาน"} · ค้างต่อ ${line.remainingQuantity - qty} ชิ้น`
                : `ค้างอยู่ ${line.remainingQuantity} ชิ้น · กล่องละ ${line.packingQuantity} ชิ้น`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!qtyValid || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
              บันทึกผลผลิตและสร้าง QR
            </Button>
            {!closeOpen && (
              <Button type="button" variant="outline" onClick={() => setCloseOpen(true)}>
                <XCircle className="size-4" />
                ปิดยอดค้าง
              </Button>
            )}
          </div>
        </form>
      )}

      {canRecord && closeOpen && line.remainingQuantity > 0 && (
        <form onSubmit={closeRemaining} className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning-soft p-3">
          <Label htmlFor={`${id}-reason`}>
            ปิดยอดค้าง {line.remainingQuantity} ชิ้น — จะไม่ผลิตส่วนนี้แล้ว ระบุเหตุผล
          </Label>
          <Input
            id={`${id}-reason`}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เช่น ลูกค้าลดยอด, วัตถุดิบไม่พอ"
            required
          />
          <div className="flex gap-2">
            <Button type="submit" variant="danger" size="sm" disabled={!reason.trim() || closing}>
              {closing && <Loader2 className="size-4 animate-spin" />}
              ยืนยันปิดยอดค้าง
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCloseOpen(false)}>
              ยกเลิก
            </Button>
          </div>
        </form>
      )}

      {line.outputs.length > 0 && (
        <details className="border-t border-border pt-3">
          <summary className="cursor-pointer select-none text-sm font-medium text-fg">
            ประวัติบันทึกผลผลิต ({line.outputs.length} ครั้ง)
          </summary>
          <ul className="mt-2 flex flex-col divide-y divide-border text-sm">
            {line.outputs.map((output) => (
              <li key={output.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="font-medium text-fg">{workDateFormat.format(new Date(`${output.workDate}T00:00:00`))}</span>
                {output.shift && <Badge variant="neutral">กะ {output.shift}</Badge>}
                <span className="tabular-nums text-fg">
                  {output.quantity} ชิ้น · {output.boxCount} กล่อง
                </span>
                <span className="text-xs text-fg-secondary">
                  บันทึก {timeFormat.format(new Date(output.performedAt))}
                  {output.performedBy ? ` · ${output.performedBy}` : ""}
                </span>
                {output.remark && <span className="text-xs text-fg-secondary">“{output.remark}”</span>}
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => onPrintOutput(output.id)}>
                  <Printer className="size-4" />
                  พิมพ์ QR
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
