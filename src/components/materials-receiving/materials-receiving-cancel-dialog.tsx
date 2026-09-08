"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MaterialReceiving } from "@/lib/api/materials-receiving";

export function MaterialsReceivingCancelDialog({
  receiving,
  onOpenChange,
  onConfirm,
}: {
  receiving: MaterialReceiving | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (receiving: MaterialReceiving, cancelReason: string) => void;
}) {
  // No reset-on-open effect — the parent keys this component by the target
  // receiving's id, so `reason`'s useState initializer already runs fresh
  // every time a different row is targeted (see AGENTS.md § Material
  // Receiving, same "derive, don't effect" pattern as the form dialog).
  const [reason, setReason] = React.useState("");

  return (
    <Dialog open={!!receiving} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        {receiving && (
          <>
            <DialogHeader>
              <DialogTitle>ยกเลิกรายการรับเข้า?</DialogTitle>
              <DialogDescription>
                ยกเลิก {receiving.internalLotNo}
                {receiving.status === "confirmed" ? " — ระบบจะปรับยอดสต็อกคืนให้อัตโนมัติ" : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-cancel-reason">เหตุผลการยกเลิก</Label>
              <Textarea
                id="mr-cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุเหตุผล..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                ปิด
              </Button>
              <Button
                variant="danger"
                disabled={reason.trim().length === 0}
                onClick={() => {
                  onConfirm(receiving, reason.trim());
                  onOpenChange(false);
                }}
              >
                ยืนยันการยกเลิก
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
