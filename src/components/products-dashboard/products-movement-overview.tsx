"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CalendarRange,
  PackageCheck,
  Scale,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Breakdown,
  DailyTable,
  Empty,
  Kpi,
  Panel,
  RangePicker,
  RankList,
  Split,
  TREND_VIEWS,
  nf,
  type TrendView,
} from "@/components/materials-dashboard/materials-movement-overview";
import {
  MaterialsMovementChart,
  type MovementMetric,
} from "@/components/materials-dashboard/materials-movement-chart";
import { ProductsTotalsTable } from "./products-totals-table";
import type { ProductsOverview } from "@/lib/api/products-dashboard";
import { formatThaiDate } from "@/lib/production-day";
import { cn } from "@/lib/utils";

const RECEIVE_SOURCE: Record<string, string> = { production: "ผลิต (แพ็กกล่อง FG)", manual: "บันทึกด้วยมือ" };
const ISSUE_SOURCE: Record<string, string> = { sales: "ขาย / ส่งมอบลูกค้า", manual: "บันทึกด้วยมือ" };

function StockHealth({ stock }: { stock: ProductsOverview["stock"] }) {
  const total = Math.max(stock.total, 1);
  const parts = [
    { label: "ปกติ", value: stock.normal, bar: "bg-success", text: "text-success-fg" },
    { label: "ต่ำกว่าขั้นต่ำ", value: stock.lowStock, bar: "bg-warning", text: "text-warning-fg" },
    { label: "หมดสต็อก", value: stock.outOfStock, bar: "bg-danger", text: "text-danger-fg" },
  ];
  return (
    <Card className="p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">สถานะสต็อกสินค้า</h2>
        <p className="text-xs text-fg-muted">{nf.format(stock.total)} รายการที่ใช้งาน · คงเหลือรวม {nf.format(stock.totalQty)}</p>
      </div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label="สัดส่วนสถานะสต็อก">
        {parts.map((p) => (
          <div key={p.label} className={p.bar} style={{ width: `${(p.value / total) * 100}%` }} />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <div key={p.label}>
            <dt className="flex items-center gap-1.5 text-xs text-fg-muted">
              <span className={cn("size-2 rounded-full", p.bar)} aria-hidden="true" />
              {p.label}
            </dt>
            <dd className={cn("text-lg font-semibold tabular-nums", p.text)}>{nf.format(p.value)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function ProductsMovementOverview({ overview, today }: { overview: ProductsOverview; today: string }) {
  const { range, totals, stock } = overview;
  const [metric, setMetric] = React.useState<MovementMetric>("qty");
  const [trendView, setTrendView] = React.useState<TrendView>("combo");
  const [showReceived, setShowReceived] = React.useState(true);
  const [showDisbursed, setShowDisbursed] = React.useState(true);
  const net = totals.receivedQty - totals.disbursedQty;
  const hasData = totals.receivedDocs + totals.disbursedDocs > 0;
  const access = { receiving: true, disbursement: true };

  return (
    <section className="flex flex-col gap-4" aria-label="รับเข้าและจ่ายออกสินค้า">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
            <CalendarRange className="size-4 text-primary" aria-hidden="true" />
            รับเข้า – จ่ายออก
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            {formatThaiDate(range.from)} – {formatThaiDate(range.to)} · {range.days} วัน · ความเคลื่อนไหวสต็อกสินค้าสำเร็จรูป
          </p>
        </div>
        <RangePicker key={`${range.from}-${range.to}`} from={range.from} to={range.to} today={today} />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="รับเข้า" value={nf.format(totals.receivedQty)} note={`${nf.format(totals.receivedDocs)} รายการ`} icon={ArrowDownToLine} tone="bg-success-soft text-success" />
        <Kpi label="จ่ายออก" value={nf.format(totals.disbursedQty)} note={`${nf.format(totals.disbursedDocs)} รายการ`} icon={ArrowUpFromLine} tone="bg-warning-soft text-warning" />
        <Kpi label="สุทธิ (รับ − จ่าย)" value={`${net > 0 ? "+" : ""}${nf.format(net)}`} note={net >= 0 ? "สต็อกเพิ่มขึ้นในช่วงนี้" : "สต็อกลดลงในช่วงนี้"} icon={Scale} tone="bg-primary-soft text-primary" />
        <Kpi label="คงเหลือรวมตอนนี้" value={nf.format(stock.totalQty)} note={`ต่ำ/หมด ${nf.format(stock.lowStock + stock.outOfStock)} จาก ${nf.format(stock.total)} รายการ`} icon={PackageCheck} tone="bg-surface-2 text-fg-secondary" />
      </div>

      <Panel
        title="แนวโน้มรายวัน"
        hint={trendView === "combo" ? "แท่ง = ยอดแต่ละวัน · เส้น = ยอดสุทธิสะสม" : trendView === "net" ? "แต่ละวัน = รับเข้า − จ่ายออก (แดง = จ่ายมากกว่ารับ)" : trendView === "table" ? "สรุปรายวันพร้อมยอดรวม" : "ยอดแต่ละวันของช่วงที่เลือก"}
        action={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="รูปแบบการแสดง">
              {TREND_VIEWS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={trendView === key}
                  title={label}
                  aria-label={label}
                  onClick={() => setTrendView(key)}
                  className={cn("flex items-center gap-1 rounded px-2 py-1 text-xs font-medium", trendView === key ? "bg-primary-soft text-primary" : "text-fg-secondary hover:bg-surface-2")}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="หน่วยของกราฟ">
              {(["qty", "docs"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={metric === m}
                  onClick={() => setMetric(m)}
                  className={cn("rounded px-2.5 py-1 text-xs font-medium", metric === m ? "bg-primary-soft text-primary" : "text-fg-secondary hover:bg-surface-2")}
                >
                  {m === "qty" ? "ปริมาณ" : "รายการ"}
                </button>
              ))}
            </div>
            <button type="button" aria-pressed={showReceived} onClick={() => setShowReceived((v) => !v)} className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", showReceived ? "border-success/40 bg-success-soft text-success-fg" : "border-border text-fg-muted")}>
              รับเข้า
            </button>
            <button type="button" aria-pressed={showDisbursed} onClick={() => setShowDisbursed((v) => !v)} className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", showDisbursed ? "border-warning/40 bg-warning-soft text-warning-fg" : "border-border text-fg-muted")}>
              จ่ายออก
            </button>
          </div>
        }
      >
        <div className={trendView === "table" ? "pb-3 pt-3" : "px-3 pb-3 pt-4"}>
          {!hasData ? (
            <Empty>ยังไม่มีความเคลื่อนไหวสต็อกสินค้าในช่วงเวลานี้ — ลองเลือกช่วงวันที่กว้างขึ้น</Empty>
          ) : trendView === "table" ? (
            <DailyTable days={overview.daily} access={access} />
          ) : (
            <MaterialsMovementChart days={overview.daily} metric={metric} kind={trendView} showReceived={showReceived} showDisbursed={showDisbursed} />
          )}
        </div>
      </Panel>

      <ProductsTotalsTable rows={overview.byProduct} />

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <StockHealth stock={stock} />
        <Panel title="สินค้าที่ต้องเติมสต็อก" hint="ต่ำกว่าขั้นต่ำหรือหมดสต็อก (สูงสุด 8 รายการ)">
          {overview.lowStock.length === 0 ? (
            <Empty>สต็อกสินค้าทุกรายการอยู่ในเกณฑ์ปกติ</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {overview.lowStock.map((p) => (
                <li key={p.code} className="flex items-center justify-between gap-3 px-5 py-3">
                  <p className="min-w-0 truncate text-sm text-fg">
                    <AlertTriangle className={cn("mr-1.5 inline size-3.5", p.balance <= 0 ? "text-danger" : "text-warning")} aria-hidden="true" />
                    <span className="font-mono text-xs text-primary">{p.code}</span>
                    <span className="ml-2 text-fg-secondary">{p.name}</span>
                  </p>
                  <p className="shrink-0 text-sm tabular-nums">
                    <span className={cn("font-semibold", p.balance <= 0 ? "text-danger-fg" : "text-warning-fg")}>{nf.format(p.balance)}</span>
                    <span className="text-xs text-fg-muted"> / ขั้นต่ำ {nf.format(p.minStock)} {p.unit ?? ""}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Breakdown
          title="สินค้าที่รับเข้ามากที่สุด"
          hint="Top 8 ตามปริมาณ"
          rows={overview.topReceived.map((r) => ({ label: `${r.code} ${r.name}`, qty: r.qty }))}
          list={<RankList rows={overview.topReceived} barClass="bg-chart-2" />}
        />
        <Breakdown
          title="สินค้าที่จ่ายออกมากที่สุด"
          hint="Top 8 ตามปริมาณ"
          rows={overview.topIssued.map((r) => ({ label: `${r.code} ${r.name}`, qty: r.qty }))}
          list={<RankList rows={overview.topIssued} barClass="bg-chart-3" />}
        />
        <Breakdown
          title="จ่ายออกตามลูกค้า"
          hint="ตามปริมาณ (ลูกค้าของสินค้า)"
          rows={overview.byCustomer.map((c) => ({ label: c.name, qty: c.qty }))}
          list={<Split rows={overview.byCustomer.map((c) => ({ label: c.name, qty: c.qty, docs: c.docs }))} />}
        />
        <Breakdown
          title="แหล่งที่มาของการเคลื่อนไหว"
          hint="รับเข้าจากผลิต / ด้วยมือ และจ่ายออกจากการขาย / ด้วยมือ"
          rows={[
            ...overview.receiveSource.map((s) => ({ label: `รับเข้า: ${RECEIVE_SOURCE[s.source] ?? s.source}`, qty: s.qty })),
            ...overview.issueSource.map((s) => ({ label: `จ่ายออก: ${ISSUE_SOURCE[s.source] ?? s.source}`, qty: s.qty })),
          ]}
          list={
            <Split
              rows={[
                ...overview.receiveSource.map((s) => ({ label: `รับเข้า: ${RECEIVE_SOURCE[s.source] ?? s.source}`, qty: s.qty, docs: s.docs })),
                ...overview.issueSource.map((s) => ({ label: `จ่ายออก: ${ISSUE_SOURCE[s.source] ?? s.source}`, qty: s.qty, docs: s.docs })),
              ]}
            />
          }
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {([
          ["รายการรับเข้าล่าสุด", overview.recentReceives, "+", "text-success-fg"],
          ["รายการจ่ายออกล่าสุด", overview.recentIssues, "−", "text-warning-fg"],
        ] as const).map(([title, rows, sign, tone]) => (
          <Panel
            key={title}
            title={title}
            hint="ล่าสุดในช่วงเวลาที่เลือก"
            action={
              <Link href="/engineering/products" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                ทะเบียนสินค้า <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            }
          >
            {rows.length === 0 ? (
              <Empty>ไม่มีรายการ</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-fg">
                        <span className="font-mono text-xs text-primary">{r.productCode}</span>
                        <span className="ml-2 text-fg-secondary">{r.productName}</span>
                      </p>
                      <p className="truncate text-[11px] text-fg-muted">
                        <span className="font-mono">{r.referenceNo}</span> · {formatThaiDate(r.date)}
                      </p>
                    </div>
                    <p className={cn("shrink-0 text-sm font-semibold tabular-nums", tone)}>
                      {sign}{nf.format(r.qty)} <span className="text-xs font-normal text-fg-muted">{r.unit ?? ""}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
    </section>
  );
}
