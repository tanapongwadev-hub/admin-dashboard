"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MaterialJobOrderListRow } from "@/lib/api/material-job-orders";
import type { MaterialJobOrderStatus } from "@/lib/api/production-plans";

export const STATUS: Record<
  MaterialJobOrderStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  WAITING_PICKING: { label: "รอหยิบสินค้า", variant: "warning" },
  READY_TO_ISSUE: { label: "พร้อมจ่ายออก", variant: "info" },
  PARTIALLY_ISSUED: { label: "จ่ายออกบางส่วน", variant: "info" },
  ISSUED: { label: "จ่ายออกครบแล้ว", variant: "success" },
  CANCELLED: { label: "ยกเลิก", variant: "neutral" },
};

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function productSummary(jobOrder: MaterialJobOrderListRow) {
  if (jobOrder.products.length === 0) return "—";
  const [first, ...rest] = jobOrder.products;
  return rest.length
    ? `${first.productCode} +${rest.length} รายการ`
    : first.productCode;
}

export function MaterialJobOrderTable({
  jobOrders,
  canPrint,
}: {
  jobOrders: MaterialJobOrderListRow[];
  canPrint: boolean;
}) {
  if (jobOrders.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <p className="font-medium text-fg">ยังไม่มีใบจัดงาน</p>
        <p className="mt-1 text-sm text-fg-muted">
          ใบจัดงานจะถูกสร้างขึ้นทันทีที่แผนการผลิตได้รับการอนุมัติ
        </p>
      </div>
    );
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>เลขใบจัดงาน</TableHead>
            <TableHead>เลขแผน</TableHead>
            <TableHead>สินค้า</TableHead>
            <TableHead>จำนวนวัสดุ</TableHead>
            <TableHead>จำนวนกล่อง</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>อนุมัติเมื่อ</TableHead>
            <TableHead className="w-24">
              <span className="sr-only">การทำงาน</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobOrders.map((jobOrder) => (
            <TableRow key={jobOrder.id}>
              <TableCell>
                <Button asChild type="button" variant="link" className="h-auto p-0 font-mono text-sm">
                  <Link href={`/materials/job-orders/${jobOrder.id}`}>
                    {jobOrder.code}
                  </Link>
                </Button>
              </TableCell>
              <TableCell className="font-mono text-sm text-fg-muted">
                {jobOrder.productionPlan.code}
              </TableCell>
              <TableCell className="max-w-56 truncate">
                {productSummary(jobOrder)}
              </TableCell>
              <TableCell>{jobOrder.materialCount.toLocaleString("th-TH")}</TableCell>
              <TableCell>{jobOrder.packageCount.toLocaleString("th-TH")}</TableCell>
              <TableCell>
                <Badge variant={STATUS[jobOrder.status].variant} dot>
                  {STATUS[jobOrder.status].label}
                </Badge>
              </TableCell>
              <TableCell>{date(jobOrder.productionPlan.approvedAt)}</TableCell>
              <TableCell>
                {canPrint && jobOrder.status !== "CANCELLED" && (
                  <Button
                    asChild
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`พิมพ์ใบจัดงาน ${jobOrder.code}`}
                  >
                    <Link href={`/materials/job-orders/${jobOrder.id}?print=1`}>
                      <Printer className="size-4" />
                    </Link>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
