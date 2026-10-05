"use client";

import { Loader2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { reverseLotRequestAction } from "@/app/(dashboard)/products/process-orders/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LineBoard } from "@/lib/api/production-lots";

export interface ReverseTarget {
  lineId: string;
  /** requestId of the produce/transfer being taken back. */
  requestId: string;
  /** What was recorded, e.g. "บันทึกผลิต 100 ชิ้น → WE-691005-001". */
  label: string;
}

/**
 * "กลับรายการ" — takes back one produce/transfer by appending reversal
 * movements (nothing is deleted). Only allowed while the pieces have not moved
 * on; the server says why otherwise. Reason is required. Remounted per open
 * (key), so its own requestId — the reversal's idempotency key — is fresh.
 */
export function ReverseDialog({
  target,
  onClose,
  onDone,
}: {
  target: ReverseTarget;
  onClose: () => void;
  onDone: (board: LineBoard) => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || saving) return;
    setSaving(true);
    const result = await reverseLotRequestAction(target.lineId, target.requestId, {
      requestId,
      reason: reason.trim(),
    });
    setSaving(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(
      `กลับรายการแล้ว: ${result.result.movements.map((m) => `${m.qty} ชิ้น${m.lotNo ? ` (${m.lotNo})` : ""}`).join(", ")}`,
    );
    onDone(result.board);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>กลับรายการ</DialogTitle>
            <DialogDescription>
              {target.label} — ชิ้นงานจะกลับไปรอที่ขั้นตอนเดิม ประวัติเดิมยังเก็บไว้ครบ กลับรายการได้เฉพาะเมื่อชิ้นงานชุดนี้ยังไม่ถูกส่งต่อหรือแพ็ก
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 px-6">
            <Label htmlFor="rv-reason">เหตุผล</Label>
            <Textarea
              id="rv-reason"
              value={reason}
              maxLength={500}
              rows={3}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น บันทึกจำนวนผิด"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="danger" disabled={!reason.trim() || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
              ยืนยันกลับรายการ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
