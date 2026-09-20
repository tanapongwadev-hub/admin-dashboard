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
import type { MaterialsDisbursement } from "@/lib/api/materials-disbursement";

// Same shape as materials-receiving-cancel-dialog.tsx (see AGENTS.md §
// Material Receiving) — parent keys this by the target disbursement's id so
// `reason`'s useState initializer runs fresh per target, no reset-on-open
// effect needed.
export function MaterialsDisbursementCancelDialog({
  disbursement,
  onOpenChange,
  onConfirm,
}: {
  disbursement: MaterialsDisbursement | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (disbursement: MaterialsDisbursement, cancelReason: string) => void;
}) {
  const [reason, setReason] = React.useState("");

  return (
    <Dialog open={!!disbursement} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        {disbursement && (
          <>
            <DialogHeader>
              <DialogTitle>ยกเลิกรายการจ่ายออก?</DialogTitle>
              <DialogDescription>
                ยกเลิก {disbursement.disbursementNo}
                {disbursement.status === "confirmed" ? " — ระบบจะคืนสต็อกให้อัตโนมัติ" : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="md-cancel-reason">เหตุผลการยกเลิก</Label>
              <Textarea
                id="md-cancel-reason"
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
                  onConfirm(disbursement, reason.trim());
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
