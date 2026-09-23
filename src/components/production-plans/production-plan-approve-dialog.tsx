"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ProductionPlan,
  ProductionPlanShortfall,
} from "@/lib/api/production-plans";
import { formatNumber } from "@/lib/utils";

export function ProductionPlanApproveDialog({
  plan,
  shortfalls,
  onOpenChange,
  onConfirm,
}: {
  plan: ProductionPlan | null;
  shortfalls: ProductionPlanShortfall[];
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const [pending, setPending] = React.useState(false);
  return (
    <Dialog open={!!plan} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-info-soft text-info">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <DialogTitle>อนุมัติและกันสต็อก {plan?.code}</DialogTitle>
              <DialogDescription>
                ระบบจะคำนวณวัตถุดิบจาก BOM ที่ผูกไว้และกัน package ตาม FIFO แบบ
                all-or-nothing
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-2 p-4 text-center">
            <div>
              <p className="text-xl font-semibold tabular-nums text-fg">
                {plan?.lines.length ?? 0}
              </p>
              <p className="text-xs text-fg-muted">รายการสินค้า</p>
            </div>
            <div className="border-l border-border">
              <p className="text-xl font-semibold tabular-nums text-fg">
                {plan?.lines
                  .reduce((sum, line) => sum + line.quantity, 0)
                  .toLocaleString("th-TH") ?? 0}
              </p>
              <p className="text-xs text-fg-muted">จำนวนผลิตรวม</p>
            </div>
          </div>
          {shortfalls.length > 0 && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-danger/30 bg-danger-soft p-4"
            >
              <p className="flex items-center gap-2 font-medium text-danger">
                <AlertTriangle className="size-4" />
                วัตถุดิบไม่เพียงพอ — ยังไม่มีสต็อกใดถูกกัน
              </p>
              <div className="mt-3 space-y-2">
                {shortfalls.map((item) => (
                  <div
                    key={item.materialId}
                    className="grid grid-cols-[1fr_auto] gap-3 text-sm"
                  >
                    <span className="text-fg">
                      {item.materialCode} · {item.materialName}
                    </span>
                    <span className="text-right tabular-nums text-danger">
                      ขาด {formatNumber(Number(item.shortage))}
                      <span className="block text-xs text-fg-muted">
                        ต้องใช้ {formatNumber(Number(item.required))} / มี{" "}
                        {formatNumber(Number(item.available))}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-sm text-fg-muted">
            เมื่ออนุมัติแล้ว แผนและรายการสินค้าจะแก้ไขไม่ได้
            ระบบจะสร้างใบจัดงานให้ฝ่ายคลังเตรียมวัตถุดิบทันที
            และต้องเริ่มหยิบสินค้าภายใน 3 วัน
            มิฉะนั้นระบบจะหมดอายุและปล่อยสต็อกอัตโนมัติ
          </p>
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
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await onConfirm();
              setPending(false);
            }}
          >
            <CheckCircle2 className="size-4" />
            {pending
              ? "กำลังตรวจและกันสต็อก..."
              : shortfalls.length
                ? "ตรวจสอบอีกครั้ง"
                : "ยืนยันอนุมัติ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
