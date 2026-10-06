"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { closeRemainingLotAction } from "@/app/(dashboard)/products/process-orders/actions";
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
import { Textarea } from "@/components/ui/textarea";
import type { BoardStep, LineBoard } from "@/lib/api/production-lots";
import type { ReverseTarget } from "./reverse-dialog";

/**
 * "ปิดยอดค้าง" at one step: pieces waiting there that will not be produced
 * (e.g. material ran short) are closed, oldest first. Reason required.
 * Remounted per open (fresh requestId); reversible from the success toast.
 */
export function CloseRemainingDialog({
  lineId,
  step,
  onClose,
  onDone,
  onUndo,
}: {
  lineId: string;
  step: BoardStep;
  onClose: () => void;
  onDone: (board: LineBoard) => void;
  onUndo?: (target: ReverseTarget) => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [qty, setQty] = useState(String(step.waitingQty));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const qtyNum = Number(qty) || 0;
  const over = qtyNum > step.waitingQty;
  const valid = Number.isInteger(qtyNum) && qtyNum >= 1 && !over && reason.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    const result = await closeRemainingLotAction(lineId, step.stepIndex, {
      requestId,
      qty: qtyNum,
      reason: reason.trim(),
    });
    setSaving(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    const message = `ปิดยอดค้าง ${qtyNum} ชิ้นที่ ${step.code}${result.result.orderCompleted ? " · ใบสั่งผลิตเสร็จสิ้น" : ""}`;
    toast.success(message, {
      duration: 10000,
      action: result.result.orderCompleted || !onUndo
        ? undefined
        : { label: "กลับรายการ", onClick: () => onUndo({ lineId, requestId, label: message }) },
    });
    onDone(result.board);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              ปิดยอดค้าง · {step.code} {step.name}
            </DialogTitle>
            <DialogDescription>
              ชิ้นงานที่รอผลิต {step.waitingQty.toLocaleString("th-TH")} ชิ้น ซึ่งจะไม่ผลิตต่อ (เช่น วัตถุดิบไม่พอ) — ปิดจากงานที่รอนานสุดก่อน
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cr-qty">จำนวนที่ปิด (ชิ้น)</Label>
              <Input
                id="cr-qty"
                type="number"
                inputMode="numeric"
                min={1}
                max={step.waitingQty}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                aria-invalid={over}
                aria-describedby={over ? "cr-over" : undefined}
              />
              {over && (
                <p id="cr-over" role="alert" className="text-xs text-danger">
                  เกินงานที่รอผลิต ({step.waitingQty} ชิ้น)
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cr-reason">เหตุผล</Label>
              <Textarea
                id="cr-reason"
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น วัตถุดิบไม่พอ"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="danger" disabled={!valid || saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              ยืนยันปิดยอด
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
