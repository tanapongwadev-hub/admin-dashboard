"use client";

import * as React from "react";
import { toast } from "sonner";
import { issueMaterialJobOrderAction } from "@/app/(dashboard)/materials/job-orders/actions";
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
import type { MaterialJobOrderDetail } from "@/lib/api/material-job-orders";
import { getIssueEligiblePickLines } from "@/lib/material-job-order-issue";
import { formatNumber } from "@/lib/utils";

// Remounted by the parent via a `key` derived from jobOrder.id + version
// (see job-order-detail.tsx) whenever this dialog should start from a fresh
// draft — the same parent-owned-remount convention this app uses instead of
// a reset-on-open useEffect (see AGENTS.md § Material Receiving's "Rule for
// future dialogs that reset local state on open").
export function MaterialJobOrderIssueDialog({
  open,
  jobOrder,
  onOpenChange,
  onIssued,
}: {
  open: boolean;
  jobOrder: MaterialJobOrderDetail;
  onOpenChange: (open: boolean) => void;
  onIssued: (jobOrder: MaterialJobOrderDetail) => void;
}) {
  // Only lines that are picked, not yet released, still have something
  // outstanding — the same set the backend itself is willing to issue.
  const eligibleLines = getIssueEligiblePickLines(jobOrder.pickLines);
  const [quantities, setQuantities] = React.useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        eligibleLines.map((line) => [line.reservationId, line.outstandingQuantity]),
      ),
  );
  const [submitting, setSubmitting] = React.useState(false);

  const errors = eligibleLines
    .map((line) => {
      const raw = quantities[line.reservationId] ?? "";
      const value = Number(raw);
      if (raw.trim() === "" ) return null;
      if (!Number.isFinite(value) || value < 0)
        return `${line.materialCode} · กล่อง ${line.packageNo}: จำนวนไม่ถูกต้อง`;
      if (value > Number(line.outstandingQuantity))
        return `${line.materialCode} · กล่อง ${line.packageNo}: เกินจำนวนคงเหลือ (${formatNumber(Number(line.outstandingQuantity))})`;
      return null;
    })
    .filter((message): message is string => !!message);

  const items = eligibleLines
    .map((line) => ({
      reservationId: line.reservationId,
      quantity: (quantities[line.reservationId] ?? "").trim(),
    }))
    .filter((item) => item.quantity !== "" && Number(item.quantity) > 0);

  const canSubmit = errors.length === 0 && items.length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const result = await issueMaterialJobOrderAction(jobOrder.id, {
      version: jobOrder.version,
      items,
    });
    setSubmitting(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success("จ่ายออกวัตถุดิบแล้ว", { description: jobOrder.code });
    onIssued(result.jobOrder);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl">
        <DialogHeader>
          <DialogTitle>จ่ายออกวัตถุดิบ — {jobOrder.code}</DialogTitle>
          <DialogDescription>
            ระบบตัดสต็อกได้เฉพาะกล่อง/QR ที่ถูกกันไว้ให้ใบจัดงานนี้เท่านั้น
            ปล่อยจำนวนเป็น 0 หรือว่างไว้ถ้ายังไม่ต้องการจ่ายกล่องนั้น
          </DialogDescription>
        </DialogHeader>
        {eligibleLines.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-muted">
            ยังไม่มีกล่องที่หยิบแล้วและพร้อมจ่ายออก
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {eligibleLines.map((line) => (
              <div
                key={line.reservationId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">
                    {line.materialCode} · {line.materialName}
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    กล่อง {line.packageNo} · QR {line.qrCode ?? "—"} · คงเหลือ{" "}
                    {formatNumber(Number(line.outstandingQuantity))}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={Number(line.outstandingQuantity)}
                  step="0.0001"
                  value={quantities[line.reservationId] ?? ""}
                  onChange={(e) =>
                    setQuantities((prev) => ({
                      ...prev,
                      [line.reservationId]: e.target.value,
                    }))
                  }
                  className="w-32 shrink-0 text-right"
                />
              </div>
            ))}
          </div>
        )}
        {errors.length > 0 && (
          <p className="text-sm text-danger">{errors[0]}</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void submit()}>
            จ่ายออก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
