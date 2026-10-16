"use client";

import Link from "next/link";
import { PackageCheck } from "lucide-react";
import type { PageMeta, SalesJobOrderListRow } from "@/lib/api/sales";
import {
  formatThaiDate,
  formatThaiDateTime,
  SALES_JOB_ORDER_STATUS_LABELS,
} from "@/lib/filters/sales-filters";
import { SalesJobOrderStatusBadge } from "./sales-badges";
import { SalesFilterBar, SalesPagination } from "./sales-filter-bar";

export function SalesJobOrderList({
  jobOrders,
  meta,
}: {
  jobOrders: SalesJobOrderListRow[];
  meta: PageMeta;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SalesFilterBar
        idPrefix="sales-job-orders"
        statusLabels={SALES_JOB_ORDER_STATUS_LABELS}
        searchPlaceholder="ค้นหาเลขใบจัดงาน เลขออเดอร์ หรือลูกค้า..."
        dateLabel="วันที่สร้าง"
        totalItems={meta.totalItems}
      />
      {jobOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <PackageCheck className="size-8 text-fg-muted" />
          <p className="font-medium text-fg">ยังไม่มีใบจัดงานขาย</p>
          <p className="text-sm text-fg-muted">ใบจัดงานถูกสร้างอัตโนมัติเมื่อยืนยันออเดอร์ขาย</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-surface-2 text-left text-xs text-fg-muted">
              <tr>
                <th className="px-3 py-2.5">ใบจัดงาน</th>
                <th className="px-3 py-2.5">ออเดอร์ / ลูกค้า</th>
                <th className="px-3 py-2.5">กำหนดส่ง</th>
                <th className="px-3 py-2.5 text-right">หยิบแล้ว</th>
                <th className="px-3 py-2.5 text-right">ตัดสต็อก / จอง</th>
                <th className="px-3 py-2.5">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {jobOrders.map((job) => (
                <tr key={job.id} className="border-t border-border">
                  <td className="px-3 py-3">
                    <Link
                      href={`/sales/job-orders/${job.id}`}
                      className="font-mono font-medium text-primary hover:underline"
                    >
                      {job.code}
                    </Link>
                    <span className="block text-xs text-fg-muted">
                      {formatThaiDateTime(job.createdAt)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs text-fg-muted">{job.salesOrder.code}</span>
                    <span className="block text-fg">{job.customer.nameTh}</span>
                  </td>
                  <td className="px-3 py-3 text-fg-secondary">
                    {formatThaiDate(job.salesOrder.dueDate)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {job.pickedCount}/{job.boxCount} กล่อง
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-semibold">
                    {job.issuedQty.toLocaleString("th-TH")} / {job.reservedQty.toLocaleString("th-TH")}
                  </td>
                  <td className="px-3 py-3">
                    <SalesJobOrderStatusBadge status={job.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SalesPagination meta={meta} />
    </div>
  );
}
