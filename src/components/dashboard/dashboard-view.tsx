"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardList, Factory, TriangleAlert } from "lucide-react";
import { ChartCard, ChartLegendItem } from "@/components/dashboard/chart-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DashboardHeader, type TrendRange } from "@/components/dashboard/dashboard-header";
import { StockMovementChart } from "@/components/dashboard/stock-movement-chart";
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart";
import { RecentDocuments, RecentDocumentsFooter } from "@/components/dashboard/recent-documents";
import { LowStockWatchlist } from "@/components/dashboard/low-stock-watchlist";
import type { DashboardData } from "@/lib/dashboard-loader";
import { formatNumber } from "@/lib/utils";

// Renders server-fetched data (lib/dashboard-loader.ts). Only the 7/14-day
// window and CSV export live here; every block is hidden when the viewer
// lacks the permission for its source.
export function DashboardView({ greeting, data }: { greeting: string; data: DashboardData }) {
  const [range, setRange] = useState<TrendRange>("14");

  const { inventory, watchlist, documents } = data;
  const alertCount = inventory ? inventory.lowStock + inventory.outOfStock : 0;
  const needsAttention = alertCount > 0;
  const activeOrders = data.productionOrders.IN_PROGRESS ?? 0;
  const activePlans = (data.productionPlans.DRAFT ?? 0) + (data.productionPlans.APPROVED ?? 0);
  const hasProduction = Object.keys(data.productionOrders).length + Object.keys(data.productionPlans).length > 0;
  const hasDocuments = data.canViewReceiving || data.canViewDisbursement;
  const trend = range === "7" ? data.trend.slice(-7) : data.trend;
  const receivedTotal = trend.reduce((sum, point) => sum + point.received, 0);
  const disbursedTotal = trend.reduce((sum, point) => sum + point.disbursed, 0);

  const healthSlices = inventory
    ? [
        { name: "ปกติ", value: inventory.normal, color: "success" },
        { name: "ใกล้หมด", value: inventory.lowStock, color: "warning" },
        { name: "หมดสต็อก", value: inventory.outOfStock, color: "danger" },
      ].filter((slice) => slice.value > 0)
    : [];

  function handleExport() {
    const header = ["เอกสาร", "ประเภท", "วัสดุ", "ผู้จัดจำหน่าย/ประเภท", "สถานะ", "จำนวน", "หน่วย", "วันที่"];
    const rows = documents.map((doc) => [doc.id, doc.type, doc.material, doc.counterparty, doc.status, String(doc.qty), doc.unit, doc.date]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    // Leading BOM so Excel opens the Thai headers as UTF-8 instead of mojibake.
    const blob = new Blob([String.fromCharCode(0xfeff), csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-documents-${data.loadedAt.slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <DashboardHeader
        greeting={greeting}
        needsAttention={needsAttention}
        lowStockCount={alertCount}
        range={range}
        onRangeChange={setRange}
        onExport={handleExport}
      />

      <section aria-label="สรุปตัวชี้วัดหลัก" className="@container">
        <div className="grid grid-cols-1 gap-4 @min-[30rem]:grid-cols-2 @min-[54rem]:grid-cols-4">
          {inventory && (
            <KpiCard
              label="วัสดุที่ใช้งาน"
              value={formatNumber(inventory.total)}
              unit="รายการ"
              comparison={`ปกติ ${formatNumber(inventory.normal)} รายการ`}
              icon={Boxes}
            />
          )}
          {(
            <KpiCard
              label="รับเข้า 7 วันล่าสุด"
              value={formatNumber(data.receivedLast7)}
              unit="เอกสาร"
              comparison="เฉพาะที่ยืนยันแล้ว"
              icon={ArrowDownToLine}
              sparkline={data.trend.slice(-7).map((point) => point.received)}
              sparklineClassName="hidden text-[color:var(--chart-2)] @min-[72rem]:block"
            />
          )}
          {(
            <KpiCard
              label="เบิกจ่าย 7 วันล่าสุด"
              value={formatNumber(data.disbursedLast7)}
              unit="เอกสาร"
              comparison="เฉพาะที่ยืนยันแล้ว"
              icon={ArrowUpFromLine}
              sparkline={data.trend.slice(-7).map((point) => point.disbursed)}
              sparklineClassName="hidden text-[color:var(--chart-3)] @min-[72rem]:block"
            />
          )}
          {inventory && (
            <KpiCard
              label="แจ้งเตือนสต็อก"
              value={formatNumber(alertCount)}
              unit="รายการ"
              comparison={`ใกล้หมด ${inventory.lowStock} · หมด ${inventory.outOfStock}`}
              icon={TriangleAlert}
              alert={needsAttention}
            />
          )}
          {hasProduction && (
            <KpiCard
              label="ใบสั่งผลิตที่กำลังดำเนินการ"
              value={formatNumber(activeOrders)}
              unit="ใบสั่ง"
              comparison={`ทั้งหมด ${formatNumber(Object.values(data.productionOrders).reduce((a, b) => a + b, 0))} ใบสั่ง`}
              icon={Factory}
            />
          )}
          {hasProduction && (
            <KpiCard
              label="แผนผลิตที่รอดำเนินการ"
              value={formatNumber(activePlans)}
              unit="แผน"
              comparison={`ร่าง ${data.productionPlans.DRAFT ?? 0} · อนุมัติ ${data.productionPlans.APPROVED ?? 0}`}
              icon={ClipboardList}
            />
          )}
        </div>
      </section>

      <div className="@container min-w-0">
        <div className="grid min-w-0 grid-cols-1 gap-5 @min-[38rem]:grid-cols-2 @min-[62rem]:grid-cols-3">
          {(
            <ChartCard
              title="เอกสารรับเข้าและเบิกจ่าย"
              description={`จำนวนเอกสารที่ยืนยันแล้วรายวัน ${range} วันที่ผ่านมา`}
              className={inventory ? "@min-[38rem]:col-span-2" : "@min-[38rem]:col-span-2 @min-[62rem]:col-span-3"}
              actions={
                <>
                  <ChartLegendItem color="var(--chart-2)" label="รับเข้า" />
                  <ChartLegendItem color="var(--chart-3)" label="เบิกจ่าย" />
                </>
              }
              footer={
                <>
                  <ChartLegendItem color="var(--chart-2)" label="รวมรับเข้า" value={`${formatNumber(receivedTotal)} เอกสาร`} />
                  <ChartLegendItem color="var(--chart-3)" label="รวมเบิกจ่าย" value={`${formatNumber(disbursedTotal)} เอกสาร`} />
                </>
              }
            >
              <StockMovementChart data={trend} format={formatNumber} labels={{ received: "รับเข้า", disbursed: "เบิกจ่าย" }} />
            </ChartCard>
          )}

          {inventory && (
            <ChartCard title="สุขภาพสต็อก" description="สัดส่วนวัสดุที่ใช้งานตามสถานะสต็อก">
              <CategoryBreakdownChart data={healthSlices} format={formatNumber} totalLabel="รายการวัสดุ" />
            </ChartCard>
          )}

          {inventory && data.canViewStock && (
            <ChartCard
              title="รายการเฝ้าระวังสต็อก"
              description="วัสดุที่หมดหรือต่ำกว่าสต็อกขั้นต่ำ"
              className="@min-[38rem]:col-span-2"
              actions={
                watchlist.length > 0 ? (
                  <span className="rounded-md bg-warning-soft px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-warning">
                    {watchlist.length} รายการ
                  </span>
                ) : undefined
              }
            >
              <LowStockWatchlist items={watchlist} />
            </ChartCard>
          )}

          {hasDocuments && (
          <ChartCard
            title="เอกสารล่าสุด"
            description={`เอกสารรับเข้าและเบิกจ่ายล่าสุด ${documents.length} รายการ`}
            className="@min-[38rem]:col-span-2 @min-[62rem]:col-span-3"
            bodyClassName="p-0"
            actions={<RecentDocumentsFooter />}
          >
            <RecentDocuments documents={documents} />
          </ChartCard>
          )}
        </div>
      </div>
    </div>
  );
}
