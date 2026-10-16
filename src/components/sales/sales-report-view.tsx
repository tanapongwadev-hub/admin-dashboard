"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Download, PackageCheck, ShoppingCart, Truck, Users } from "lucide-react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Button } from "@/components/ui/button";
import type { SalesLookups, SalesReport } from "@/lib/api/sales";
import {
  formatThaiDate,
  formatThaiDateTime,
  SALES_ORDER_STATUS_LABELS,
} from "@/lib/filters/sales-filters";
import { SalesFilterBar, SalesPagination } from "./sales-filter-bar";

const n = (value: number) => value.toLocaleString("th-TH");

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function SalesReportView({
  report,
  lookups,
}: {
  report: SalesReport;
  lookups: SalesLookups;
}) {
  const { summary } = report;
  const shippedPct = summary.orderedQty
    ? Math.min(100, Math.round((summary.shippedQty / summary.orderedQty) * 100))
    : 0;

  // Exports the rows the screen is showing (current page of the shipment ledger).
  function exportCsv() {
    const header = ["เลขที่ DO", "วันที่ส่ง", "ออเดอร์", "PO ลูกค้า", "ใบจัดงาน", "รหัสลูกค้า", "ลูกค้า", "รหัสสินค้า", "สินค้า", "QR กล่อง", "Lot", "จำนวน", "ผู้ตัดสต็อก"];
    const rows = report.items.map((r) => [
      r.issueNo, r.issueDate, r.salesOrder.code, r.salesOrder.customerPo ?? "", r.jobOrder.code,
      r.customer.code, r.customer.nameTh, r.product.code, r.product.name, r.package.qrCode,
      r.package.lotNo, r.qty, r.issuedByName ?? "",
    ]);
    const csv = "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <SalesFilterBar
        idPrefix="sales-report"
        searchPlaceholder="ค้นหาเลขที่ DO เลขออเดอร์ หรือ QR กล่อง..."
        dateLabel="ช่วงวันที่"
        totalItems={report.meta.totalItems}
        customers={lookups.customers}
        products={lookups.products}
      />

      <div className="@container">
        <div className="grid grid-cols-1 gap-3 @min-[36rem]:grid-cols-2 @min-[60rem]:grid-cols-4">
          <Kpi
            icon={ShoppingCart}
            label="ออเดอร์ขาย"
            value={n(summary.orderCount)}
            hint={`สั่งรวม ${n(summary.orderedQty)} ชิ้น · ยกเลิก ${n(summary.cancelledOrderCount)}`}
          />
          <Kpi
            icon={Truck}
            label="ส่งสินค้าแล้ว"
            value={`${n(summary.shippedQty)} ชิ้น`}
            hint={`${n(summary.shipmentCount)} ใบส่งของ · ${n(summary.boxCount)} กล่อง`}
          />
          <Kpi
            icon={PackageCheck}
            label="ค้างส่ง"
            value={`${n(summary.outstandingQty)} ชิ้น`}
            hint="จากออเดอร์ที่ยืนยันแล้วในช่วงที่เลือก"
          />
          <Kpi
            icon={Users}
            label="ลูกค้าที่ส่งสินค้า"
            value={n(summary.customerCount)}
            hint={`ส่งแล้ว ${shippedPct}% ของยอดสั่ง`}
          />
        </div>
      </div>

      <div className="@container">
        <div className="grid grid-cols-1 gap-4 @min-[62rem]:grid-cols-3">
          <ChartCard
            title="ยอดส่งสินค้ารายวัน"
            description="จำนวนชิ้นที่ตัดสต็อกขายตามวันที่ส่ง"
            className="@min-[62rem]:col-span-2"
          >
            {report.byDay.length === 0 ? (
              <p className="py-16 text-center text-sm text-fg-muted">ยังไม่มีการส่งสินค้าในช่วงนี้</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={report.byDay.map((d) => ({ ...d, label: formatThaiDate(d.date) }))}
                  margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--fg-muted)", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--fg-muted)", fontSize: 12 }} width={48} />
                  <Tooltip
                    cursor={{ fill: "var(--surface-2)" }}
                    contentStyle={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="shippedQty" name="ชิ้นที่ส่ง" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="สถานะออเดอร์" description="ตามวันที่สั่งในช่วงที่เลือก">
            {report.orderStatus.length === 0 ? (
              <p className="py-16 text-center text-sm text-fg-muted">ไม่มีออเดอร์</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {report.orderStatus.map((s) => (
                  <li key={s.status} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2">
                    <span className="text-fg-secondary">{SALES_ORDER_STATUS_LABELS[s.status]}</span>
                    <span className="font-semibold tabular-nums text-fg">{n(s.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </div>
      </div>

      <div className="@container">
        <div className="grid grid-cols-1 gap-4 @min-[52rem]:grid-cols-2">
          <ChartCard title="ยอดส่งตามสินค้า" description="สูงสุด 50 รายการ">
            <RankTable
              rows={report.byProduct.map((p) => ({
                key: p.id,
                code: p.code,
                name: p.name,
                qty: p.shippedQty,
                meta: `${n(p.orderCount)} ออเดอร์ · ${n(p.boxCount)} กล่อง`,
              }))}
            />
          </ChartCard>
          <ChartCard title="ยอดส่งตามลูกค้า" description="สูงสุด 50 รายการ">
            <RankTable
              rows={report.byCustomer.map((c) => ({
                key: c.id,
                code: c.code,
                name: c.nameTh,
                qty: c.shippedQty,
                meta: `${n(c.orderCount)} ออเดอร์ · ${n(c.shipmentCount)} ใบส่งของ`,
              }))}
            />
          </ChartCard>
        </div>
      </div>

      <ChartCard
        title="รายการตัดสต็อกขาย"
        description="รายกล่องที่ส่งให้ลูกค้า — สอบกลับไปยัง Lot การผลิตได้"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={!report.items.length}>
            <Download className="size-4" />
            CSV
          </Button>
        }
        bodyClassName="px-0 py-0"
      >
        {report.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <BarChart3 className="size-8 text-fg-muted" />
            <p className="text-sm text-fg-muted">ยังไม่มีรายการตัดสต็อกขายตามตัวกรองนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-surface-2 text-left text-xs text-fg-muted">
                <tr>
                  <th className="px-4 py-2">เลขที่ DO</th>
                  <th className="px-4 py-2">ออเดอร์ / ใบจัดงาน</th>
                  <th className="px-4 py-2">ลูกค้า</th>
                  <th className="px-4 py-2">สินค้า</th>
                  <th className="px-4 py-2">กล่อง / Lot</th>
                  <th className="px-4 py-2 text-right">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((row) => (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="px-4 py-2.5">
                      <span className="font-mono font-medium text-fg">{row.issueNo}</span>
                      <span className="block text-xs text-fg-muted">
                        {formatThaiDateTime(row.issuedAt)} · {row.issuedByName || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="block font-mono text-xs text-fg">{row.salesOrder.code}</span>
                      <Link
                        href={`/sales/job-orders/${row.jobOrder.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {row.jobOrder.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="block text-fg">{row.customer.nameTh}</span>
                      <span className="text-xs text-fg-muted">{row.customer.code}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="block font-mono text-xs text-fg-muted">{row.product.code}</span>
                      <span className="text-fg">{row.product.name}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/reports/production?q=${encodeURIComponent(row.package.qrCode)}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {row.package.qrCode}
                      </Link>
                      <span className="block text-xs text-fg-muted">{row.package.lotNo}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                      {n(row.qty)} {row.product.unitName ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
      <SalesPagination meta={report.meta} />
    </div>
  );
}

function RankTable({
  rows,
}: {
  rows: Array<{ key: string; code: string; name: string; qty: number; meta: string }>;
}) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-fg-muted">ไม่มีข้อมูล</p>;
  }
  const max = Math.max(...rows.map((r) => r.qty), 1);
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-mono text-xs text-fg-muted">{row.code}</span>{" "}
              <span className="text-fg">{row.name}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-fg">{n(row.qty)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className="h-full bg-primary" style={{ width: `${(row.qty / max) * 100}%` }} />
          </div>
          <span className="text-xs text-fg-muted">{row.meta}</span>
        </li>
      ))}
    </ul>
  );
}
