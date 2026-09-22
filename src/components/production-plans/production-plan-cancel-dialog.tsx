"use client";

import * as React from "react";
import { Ban } from "lucide-react";
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
import type { ProductionPlan } from "@/lib/api/production-plans";

export function ProductionPlanCancelDialog({
  plan,
  onOpenChange,
  onConfirm,
}: {
  plan: ProductionPlan | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  return (
    <Dialog open={!!plan} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-danger-soft text-danger">
              <Ban className="size-4" />
            </span>
            <div>
              <DialogTitle>ยกเลิกแผน {plan?.code}</DialogTitle>
              <DialogDescription>
                {plan?.status === "APPROVED"
                  ? "สต็อกที่กันไว้ทั้งหมดจะถูกปล่อยกลับทันที"
                  : "แผนแบบร่างจะถูกยกเลิกและแก้ไขต่อไม่ได้"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-1.5 px-6 py-5">
          <Label htmlFor="cancel-plan-reason">เหตุผลการยกเลิก</Label>
          <Textarea
            id="cancel-plan-reason"
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            maxLength={500}
            rows={4}
            required
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            กลับ
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!reason.trim() || pending}
            onClick={async () => {
              setPending(true);
              await onConfirm(reason.trim());
              setPending(false);
            }}
          >
            {pending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
