"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChartCard, ChartLegendItem } from "@/components/dashboard/chart-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DashboardHeader, type TrendRange } from "@/components/dashboard/dashboard-header";
import {
  DashboardFilters,
  EMPTY_FILTERS,
  countActiveFilters,
  type DashboardFilterState,
} from "@/components/dashboard/dashboard-filters";
import { StockMovementChart } from "@/components/dashboard/stock-movement-chart";
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart";
import { WeeklyThroughputChart } from "@/components/dashboard/weekly-throughput-chart";
import { RecentDocuments, RecentDocumentsFooter } from "@/components/dashboard/recent-documents";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { LowStockWatchlist } from "@/components/dashboard/low-stock-watchlist";
import {
  dashboardStats,
  floorActivity,
  lowStockWatchlist,
  materialCategoryBreakdown,
  recentDocuments,
  stockMovementTrend,
} from "@/lib/dashboard-data";
import { cn, formatNumber, formatWeight } from "@/lib/utils";

// Everything below reads the same mock module the page already rendered (see
// src/lib/dashboard-data.ts) — this component only narrows and re-lays-out
// that data. No API call, no data source, and no KPI formula changed here.
export function DashboardView({ greeting }: { greeting: string }) {
  const [range, setRange] = useState<TrendRange>("14");
  const [filters, setFilters] = useState<DashboardFilterState>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const stats = dashboardStats();
  const needsAttention = stats.lowStockCount > 0;
  const activeFilterCount = countActiveFilters(filters);
  const query = filters.search.trim().toLowerCase();

  // Derived during render, never via an effect — this project's lint config
  // rejects setState-in-effect (see AGENTS.md § Materials PC).
  const trend = range === "7" ? stockMovementTrend.slice(-7) : stockMovementTrend;
  const receivedTotal = trend.reduce((sum, point) => sum + point.received, 0);
  const disbursedTotal = trend.reduce((sum, point) => sum + point.disbursed, 0);
  const netTotal = receivedTotal - disbursedTotal;

  const documents = recentDocuments.filter(
    (doc) =>
      (filters.docTypes.length === 0 || filters.docTypes.includes(doc.type)) &&
      (filters.statuses.length === 0 || filters.statuses.includes(doc.status)) &&
      (!query || `${doc.id} ${doc.material} ${doc.counterparty}`.toLowerCase().includes(query))
  );

  const categories = materialCategoryBreakdown.filter(
    (category) => filters.categories.length === 0 || filters.categories.includes(category.name)
  );

  const watchlist = lowStockWatchlist.filter(
    (item) => !query || `${item.code} ${item.name}`.toLowerCase().includes(query)
  );

  const activity = floorActivity
    .filter((item) => !query || `${item.actor} ${item.action} ${item.target}`.toLowerCase().includes(query))
    .slice(0, 6);

  // Running stock position across the window — a real derivation of the same
  // received/disbursed series, not a second data source.
  const stockTrendSeries = trend.reduce<number[]>((series, point) => {
    const previous = series.length > 0 ? series[series.length - 1] : 0;
    series.push(previous + point.received - point.disbursed);
    return series;
  }, []);

  function handleExport() {
    const header = ["เอกสาร", "ประเภท", "วัสดุ", "ผู้จัดจำหน่าย/สายการผลิต", "สถานะ", "จำนวน", "หน่วย", "วันที่"];
    const rows = documents.map((doc) => [
      doc.id,
      doc.type,
      doc.material,
      doc.counterparty,
      doc.status,
      String(doc.qty),
      doc.unit,
      doc.date,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    // Leading BOM so Excel opens the Thai headers as UTF-8 instead of mojibake.
    const blob = new Blob([String.fromCharCode(0xfeff), csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-documents-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <DashboardHeader
        greeting={greeting}
        needsAttention={needsAttention}
        lowStockCount={stats.lowStockCount}
        range={range}
        onRangeChange={setRange}
        onOpenFilters={() => setDrawerOpen(true)}
        activeFilterCount={activeFilterCount}
        onExport={handleExport}
      />

      {/* Tier 1 — the summary a reader should absorb in the first seconds.
          Container queries, not viewport breakpoints: the app shell's sidebar
          (and, below, the filter rail) eat ~500px, so a viewport-width `xl:`
          would put 4 cards in a space that only fits 2. Same technique
          material-pc-table.tsx already uses for its card grid. */}
      <section aria-label="สรุปตัวชี้วัดหลัก" className="@container">
        {/* Thresholds are measured against the real content width, not the
            viewport: a 1280px window leaves this container ~910px once the
            app sidebar is subtracted, which is exactly 4 readable KPI cards. */}
        <div className="grid grid-cols-1 gap-4 @min-[30rem]:grid-cols-2 @min-[54rem]:grid-cols-4">
        <KpiCard
          label="สต็อกคงเหลือ"
          value={formatWeight(stats.stockValue)}
          delta={{ value: "3.1%", direction: "up", sentiment: "positive" }}
          comparison="vs เดือนที่แล้ว"
          icon={Boxes}
          sparkline={stockTrendSeries}
          sparklineClassName="hidden text-primary @min-[72rem]:block"
        />
        <KpiCard
          label="รับเข้าวันนี้"
          value={formatWeight(stats.receivedToday)}
          delta={{ value: "8.4%", direction: "up", sentiment: "positive" }}
          comparison="vs เดือนที่แล้ว"
          icon={ArrowDownToLine}
          sparkline={trend.map((point) => point.received)}
          sparklineClassName="hidden text-[color:var(--chart-2)] @min-[72rem]:block"
        />
        <KpiCard
          label="เบิกจ่ายวันนี้"
          value={formatWeight(stats.disbursedToday)}
          delta={{ value: "2.7%", direction: "down", sentiment: "negative" }}
          comparison="vs เดือนที่แล้ว"
          icon={ArrowUpFromLine}
          sparkline={trend.map((point) => point.disbursed)}
          sparklineClassName="hidden text-[color:var(--chart-3)] @min-[72rem]:block"
        />
        <KpiCard
          label="แจ้งเตือนสต็อกต่ำ"
          value={formatNumber(stats.lowStockCount)}
          unit="รายการ"
          delta={{
            value: "1",
            direction: needsAttention ? "up" : "flat",
            sentiment: needsAttention ? "negative" : "neutral",
          }}
          comparison="vs เดือนที่แล้ว"
          icon={TriangleAlert}
          alert={needsAttention}
        />
        </div>
      </section>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[236px_minmax(0,1fr)]">
        {/* Filter rail — a real client-side filter over the data already on
            the page. Sticky so it stays reachable while the grid scrolls;
            replaced by a Sheet drawer below lg. */}
        <aside className="hidden min-w-0 lg:block" aria-label="ตัวกรองแดชบอร์ด">
          <div className="sticky top-0 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <DashboardFilters
              value={filters}
              onChange={setFilters}
              categoryOptions={materialCategoryBreakdown.map((category) => category.name)}
            />
          </div>
        </aside>

        <div className="@container min-w-0">
          <div className="grid min-w-0 grid-cols-1 gap-5 @min-[38rem]:grid-cols-2 @min-[62rem]:grid-cols-3">
          {/* Tier 2 — the trend gets twice the width of anything else; it is
              the one chart the page is built around. */}
          <ChartCard
            title="การเคลื่อนไหวสต็อก"
            description={`เปรียบเทียบรับเข้าและเบิกจ่าย ${range} วันที่ผ่านมา`}
            className="@min-[38rem]:col-span-2"
            actions={
              <>
                <ChartLegendItem color="var(--chart-2)" label="รับเข้า" />
                <ChartLegendItem color="var(--chart-3)" label="เบิกจ่าย" />
              </>
            }
            footer={
              <>
                <ChartLegendItem color="var(--chart-2)" label="รวมรับเข้า" value={formatWeight(receivedTotal)} />
                <ChartLegendItem color="var(--chart-3)" label="รวมเบิกจ่าย" value={formatWeight(disbursedTotal)} />
                <span className="flex items-center gap-1.5 text-xs text-fg-secondary">
                  สุทธิ
                  <span className={cn("font-semibold tabular-nums", netTotal >= 0 ? "text-success" : "text-danger")}>
                    {netTotal >= 0 ? "+" : "−"}
                    {formatWeight(Math.abs(netTotal))}
                  </span>
                </span>
              </>
            }
          >
            <StockMovementChart data={trend} />
          </ChartCard>

          {/* Tier 4 — distribution. */}
          <ChartCard
            title="สต็อกตามหมวดหมู่"
            description="สัดส่วนวัสดุคงเหลือในขณะนี้"
            actions={
              filters.categories.length > 0 ? (
                <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  กรอง {filters.categories.length}
                </span>
              ) : undefined
            }
          >
            <CategoryBreakdownChart data={categories} />
          </ChartCard>

          {/* Tier 3 — comparison. */}
          <ChartCard
            title="ปริมาณงานรายสัปดาห์"
            description="รับเข้าเทียบกับเบิกจ่ายรายวันในสัปดาห์นี้"
            actions={
              <>
                <ChartLegendItem color="var(--chart-2)" label="รับเข้า" />
                <ChartLegendItem color="var(--chart-3)" label="เบิกออก" />
              </>
            }
          >
            <WeeklyThroughputChart />
          </ChartCard>

          <ChartCard
            title="รายการเฝ้าระวังสต็อกต่ำ"
            description="วัสดุที่ต่ำกว่าจุดสั่งซื้อ"
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

          <ChartCard title="กิจกรรมบนพื้นโรงงาน" description="ความเคลื่อนไหวล่าสุดจากทีมหน้างาน">
            <RecentActivity items={activity} />
          </ChartCard>

          {/* Tier 5 — detail. Full width: five columns need the room, and it
              reads as the drill-down layer beneath the summary charts. */}
          <ChartCard
            title="เอกสารล่าสุด"
            description={
              activeFilterCount > 0
                ? `แสดง ${documents.length} จาก ${recentDocuments.length} เอกสารตามตัวกรอง`
                : `เอกสารรับเข้าและเบิกจ่ายล่าสุด ${documents.length} รายการ`
            }
            className="@min-[38rem]:col-span-2 @min-[62rem]:col-span-3"
            bodyClassName="p-0"
            actions={<RecentDocumentsFooter />}
          >
            <RecentDocuments documents={documents} onClearFilters={clearFilters} />
          </ChartCard>
          </div>
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent title="ตัวกรองแดชบอร์ด" className="w-[19rem]">
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <DashboardFilters
              value={filters}
              onChange={setFilters}
              categoryOptions={materialCategoryBreakdown.map((category) => category.name)}
              idPrefix="dash-filter-drawer"
              headerClassName="pr-10"
            />
          </div>
          <div className="border-t border-border p-3">
            <Button className="w-full" onClick={() => setDrawerOpen(false)}>
              ดูผลลัพธ์ ({documents.length} เอกสาร)
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
