"use client";

import { Boxes, CalendarDays, ClipboardList, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductionPlan } from "@/lib/api/production-plans";
import { formatNumber } from "@/lib/utils";
import { PRODUCTION_PLAN_STATUS_DISPLAY } from "./production-plan-table";

const date = (value: string) =>
  new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(
    new Date(value),
  );

export function ProductionPlanDetailsDialog({
  plan,
  loading,
  onOpenChange,
}: {
  plan: ProductionPlan | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reservations =
    plan?.lines.flatMap((line) => line.reservations ?? []) ?? [];
  const activeReserved = reservations
    .filter((item) => !item.releasedAt)
    .reduce((sum, item) => sum + Number(item.reservedQuantity), 0);
  return (
    <Dialog open={loading || !!plan} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <DialogTitle>
                {loading ? "กำลังโหลดรายละเอียด..." : plan?.code}
              </DialogTitle>
              <DialogDescription>
                {plan?.title || "รายละเอียดแผนการผลิตและการกันวัตถุดิบ"}
              </DialogDescription>
            </div>
            {plan && (
              <Badge
                variant={PRODUCTION_PLAN_STATUS_DISPLAY[plan.status].variant}
                dot
              >
                {PRODUCTION_PLAN_STATUS_DISPLAY[plan.status].label}
              </Badge>
            )}
          </div>
        </DialogHeader>
        {loading ? (
          <div
            className="px-6 py-16 text-center text-sm text-fg-muted"
            aria-live="polite"
          >
            กำลังโหลดข้อมูลแผน...
          </div>
        ) : (
          plan && (
            <div className="space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Summary
                  icon={ClipboardList}
                  label="รายการสินค้า"
                  value={plan.lines.length.toLocaleString("th-TH")}
                />
                <Summary
                  icon={Boxes}
                  label="จำนวนผลิตรวม"
                  value={plan.lines
                    .reduce((sum, line) => sum + line.quantity, 0)
                    .toLocaleString("th-TH")}
                />
                <Summary
                  icon={PackageCheck}
                  label="วัตถุดิบที่กันอยู่"
                  value={formatNumber(activeReserved)}
                />
              </div>
              <div className="relative overflow-hidden rounded-lg border border-border bg-surface-2 p-4">
                <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
                <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                  วงจรแผน
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Stage active label="ร่าง" />
                  <span className="h-px flex-1 bg-border-strong" />
                  <Stage
                    active={["APPROVED", "ISSUED"].includes(plan.status)}
                    label="กันสต็อก"
                  />
                  <span className="h-px flex-1 bg-border-strong" />
                  <Stage active={plan.status === "ISSUED"} label="ออกใบเบิก" />
                </div>
                {(plan.status === "CANCELLED" || plan.status === "EXPIRED") && (
                  <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                    {plan.status === "EXPIRED"
                      ? "แผนหมดอายุและปล่อยสต็อกแล้ว"
                      : `ยกเลิก: ${plan.cancelReason || "ไม่ระบุเหตุผล"}`}
                  </p>
                )}
              </div>
              <section>
                <h3 className="mb-2 font-medium text-fg">
                  รายการสินค้าและ BOM ที่ตรึงไว้
                </h3>
                <div className="space-y-3">
                  {plan.lines.map((line, index) => (
                    <article
                      key={line.id}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-fg">
                            {line.product.code} · {line.product.name}
                          </p>
                          <p className="mt-1 text-xs text-fg-muted">
                            BOM {line.bom?.version ?? "—"} · รายการที่{" "}
                            {index + 1}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold tabular-nums text-fg">
                            {line.quantity.toLocaleString("th-TH")}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-fg-muted">
                            <CalendarDays className="size-3" />
                            ต้องใช้ {date(line.needByDate)}
                          </p>
                        </div>
                      </div>
                      {line.bom?.items?.length ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {line.bom.items
                            .filter((item) => !item.isScrap)
                            .map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between rounded-md bg-surface-2 px-3 py-2 text-xs"
                              >
                                <span>
                                  {item.material.code} · {item.material.name}
                                </span>
                                <span className="tabular-nums text-fg-muted">
                                  {formatNumber(
                                    Number(item.quantity) * line.quantity,
                                  )}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : null}
                      {line.remark && (
                        <p className="mt-3 text-sm text-fg-muted">
                          {line.remark}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
              {reservations.length > 0 && (
                <section>
                  <h3 className="mb-2 font-medium text-fg">
                    package ที่กันตาม FIFO
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-2 text-left text-xs text-fg-muted">
                        <tr>
                          <th className="px-3 py-2">QR / Lot</th>
                          <th className="px-3 py-2">จำนวนกัน</th>
                          <th className="px-3 py-2">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map((item) => (
                          <tr key={item.id} className="border-t border-border">
                            <td className="px-3 py-2 font-mono text-xs">
                            {item.materialReceivingPackage?.lotDetailNo ||
                              item.materialReceivingPackage?.id}
                            </td>
                            <td className="px-3 py-2 tabular-nums">
                              {formatNumber(Number(item.reservedQuantity))}
                            </td>
                            <td className="px-3 py-2">
                              {item.releasedAt ? item.releaseType : "กันอยู่"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              <div className="text-xs text-fg-muted">
                สร้างเมื่อ {date(plan.createdAt)}
                {plan.approvedAt
                  ? ` · อนุมัติเมื่อ ${date(plan.approvedAt)}`
                  : ""}
                {plan.issuedAt
                  ? ` · ออกใบเบิกเมื่อ ${date(plan.issuedAt)}`
                  : ""}
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Icon className="size-4 text-primary" />
      <p className="mt-3 text-2xl font-semibold tabular-nums text-fg">
        {value}
      </p>
      <p className="text-xs text-fg-muted">{label}</p>
    </div>
  );
}
function Stage({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`flex size-16 shrink-0 flex-col items-center justify-center rounded-full border text-xs ${active ? "border-primary bg-primary-soft font-medium text-primary" : "border-border bg-surface text-fg-muted"}`}
    >
      {label}
    </span>
  );
}
