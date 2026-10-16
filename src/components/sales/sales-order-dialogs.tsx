"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, PackageCheck } from "lucide-react";
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
import type { SalesOrderDetail, SalesShortfall } from "@/lib/api/sales";
import { formatThaiDate, formatThaiDateTime } from "@/lib/filters/sales-filters";
import { SalesJobOrderStatusBadge, SalesOrderStatusBadge } from "./sales-badges";

/** Required-reason cancel dialog (remounted per target by the parent). */
export function SalesOrderCancelDialog({
  order,
  onOpenChange,
  onConfirm,
}: {
  order: SalesOrderDetail | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const shipped = (order?.shippedQuantity ?? 0) > 0;
  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ยกเลิกออเดอร์ {order?.code}</DialogTitle>
          <DialogDescription>
            {shipped
              ? "ออเดอร์นี้ส่งสินค้าไปแล้วบางส่วน — ยอดที่ส่งแล้วยังอยู่ในรายงาน ส่วนกล่องที่จองไว้แต่ยังไม่ตัดสต็อกจะถูกปล่อยคืน"
              : "กล่อง FG ที่จองไว้ในใบจัดงานขายจะถูกปล่อยคืนให้ออเดอร์อื่นใช้ได้"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="so-cancel-reason">เหตุผลการยกเลิก *</Label>
          <Textarea
            id="so-cancel-reason"
            rows={3}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
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
            {pending && <Loader2 className="size-4 animate-spin" />}
            ยืนยันการยกเลิก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SalesShortfallDialog({
  shortfalls,
  onOpenChange,
}: {
  shortfalls: SalesShortfall[] | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!shortfalls} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-warning" />
            กล่อง FG ไม่พอสำหรับยืนยันออเดอร์
          </DialogTitle>
          <DialogDescription>
            ยังไม่ได้จองสินค้าใด ๆ — แพ็กกล่องเพิ่มจากใบสั่งผลิต หรือแก้จำนวนในออเดอร์ แล้วยืนยันอีกครั้ง
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border rounded-md border border-border">
          {shortfalls?.map((s) => (
            <li key={s.productId} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
              <span className="font-medium text-fg">
                {s.productCode} · {s.productName}
              </span>
              <span className="text-fg-secondary">
                ต้องการ {s.required.toLocaleString("th-TH")} · พร้อมขาย{" "}
                {s.available.toLocaleString("th-TH")} ·{" "}
                <span className="font-semibold text-danger">
                  ขาด {s.shortfall.toLocaleString("th-TH")}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            รับทราบ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SalesOrderDetailsDialog({
  order,
  onOpenChange,
}: {
  order: SalesOrderDetail | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="flex flex-col p-0">
        {order && (
          <>
            <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <span className="font-mono">{order.code}</span>
                <SalesOrderStatusBadge status={order.status} />
              </DialogTitle>
              <DialogDescription>
                {order.customer.code} · {order.customer.nameTh}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  ["วันที่สั่ง", formatThaiDate(order.orderDate)],
                  ["กำหนดส่ง", formatThaiDate(order.dueDate)],
                  ["PO ลูกค้า", order.customerPo ?? "—"],
                  ["ยืนยันเมื่อ", formatThaiDateTime(order.confirmedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-surface-2 px-3 py-2">
                    <dt className="text-xs text-fg-muted">{label}</dt>
                    <dd className="font-medium text-fg">{value}</dd>
                  </div>
                ))}
              </dl>
              {order.jobOrder && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <PackageCheck className="size-4 text-primary" />
                  ใบจัดงานขาย
                  <Link
                    href={`/sales/job-orders/${order.jobOrder.id}`}
                    className="font-mono font-medium text-primary hover:underline"
                  >
                    {order.jobOrder.code}
                  </Link>
                  <SalesJobOrderStatusBadge status={order.jobOrder.status} />
                </div>
              )}
              {order.cancelReason && (
                <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-fg">
                  เหตุผลยกเลิก: {order.cancelReason}
                </p>
              )}
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-fg-muted">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">สินค้า</th>
                    <th className="py-2 pr-2 text-right">สั่ง</th>
                    <th className="py-2 pr-2 text-right">ส่งแล้ว</th>
                    <th className="py-2 text-right">ค้างส่ง</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((line) => (
                    <tr key={line.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-2 text-fg-muted">{line.lineNo}</td>
                      <td className="py-2 pr-2">
                        <span className="font-mono text-xs text-fg-muted">{line.product.code}</span>
                        <span className="block text-fg">{line.product.name}</span>
                        {line.remark && (
                          <span className="block text-xs text-fg-muted">{line.remark}</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {line.quantity.toLocaleString("th-TH")}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-success-fg">
                        {line.shippedQuantity.toLocaleString("th-TH")}
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        {(line.quantity - line.shippedQuantity).toLocaleString("th-TH")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {order.remark && (
                <p className="mt-4 whitespace-pre-line text-sm text-fg-secondary">
                  หมายเหตุ: {order.remark}
                </p>
              )}
            </div>
            <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ปิด
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
