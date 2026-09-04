"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";

const statusVariant: Record<OrderStatus, NonNullable<BadgeProps["variant"]>> = {
  Pending: "warning",
  Processing: "primary",
  Shipped: "info",
  Delivered: "success",
  Cancelled: "danger",
};

export function OrderDetailsDialog({
  order,
  onOpenChange,
}: {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent>
        {order && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>คำสั่งซื้อ {order.id}</DialogTitle>
                  <DialogDescription>สั่งซื้อเมื่อ {formatDate(order.date)}</DialogDescription>
                </div>
                <Badge variant={statusVariant[order.status]} dot>
                  {order.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-5 px-6 py-5">
              <div className="flex items-center gap-3">
                <UserAvatar name={order.customer} className="h-10 w-10" />
                <div>
                  <p className="text-sm font-medium text-fg">{order.customer}</p>
                  <p className="text-xs text-fg-muted">{order.email}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-fg-muted">จำนวนรายการ</p>
                  <p className="mt-0.5 font-medium text-fg">{order.items}</p>
                </div>
                <div>
                  <p className="text-fg-muted">การชำระเงิน</p>
                  <p className="mt-0.5 font-medium text-fg">{order.payment}</p>
                </div>
                <div>
                  <p className="text-fg-muted">ยอดเงิน</p>
                  <p className="mt-0.5 font-medium tabular-nums text-fg">{formatCurrency(order.amount)}</p>
                </div>
                <div>
                  <p className="text-fg-muted">รหัสคำสั่งซื้อ</p>
                  <p className="mt-0.5 font-medium text-fg">{order.id}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="mb-3 text-sm font-medium text-fg">ไทม์ไลน์การดำเนินการ</p>
                <ol className="flex flex-col gap-3">
                  {(() => {
                    const steps = ["สั่งซื้อแล้ว", "กำลังดำเนินการ", "จัดส่งแล้ว", "ส่งถึงแล้ว"];
                    const statusToStep: Record<OrderStatus, number> = {
                      Pending: 0,
                      Processing: 1,
                      Shipped: 2,
                      Delivered: 3,
                      Cancelled: -1,
                    };
                    const currentStep = statusToStep[order.status];
                    return steps.map((step, i) => (
                      <li key={step} className="flex items-center gap-3 text-sm">
                        <span
                          className={
                            "h-2 w-2 shrink-0 rounded-full " +
                            (order.status === "Cancelled" ? "bg-border-strong" : i <= currentStep ? "bg-primary" : "bg-border-strong")
                          }
                        />
                        <span className={i <= currentStep && order.status !== "Cancelled" ? "text-fg" : "text-fg-muted"}>{step}</span>
                      </li>
                    ));
                  })()}
                  {order.status === "Cancelled" && (
                    <li className="flex items-center gap-3 text-sm">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />
                      <span className="text-danger">คำสั่งซื้อถูกยกเลิก</span>
                    </li>
                  )}
                </ol>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                ปิด
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
