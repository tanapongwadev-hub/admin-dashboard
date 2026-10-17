"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BarChart3,
  CalendarRange,
  LineChart,
  ListOrdered,
  PieChart,
  Table2,
  TrendingUp,
  FileClock,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import type { MaterialsOverview, MaterialsOverviewTop } from "@/lib/api/materials-dashboard";
import { addDays, formatThaiDate } from "@/lib/production-day";
import { cn } from "@/lib/utils";
import {
  MaterialsDonut,
  MaterialsMovementChart,
  type MovementChartKind,
  type MovementMetric,
} from "./materials-movement-chart";

export const nf = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const TYPE_LABEL: Record<string, string> = { production: "เบิกเพื่อผลิต", stock_cut: "ตัดสต็อก" };

interface Preset {
  key: string;
  label: string;
  range: (today: string) => { from: string; to: string };
}

const monthStart = (date: string) => `${date.slice(0, 8)}01`;
const PRESETS: Preset[] = [
  { key: "today", label: "วันนี้", range: (t) => ({ from: t, to: t }) },
  { key: "7", label: "7 วัน", range: (t) => ({ from: addDays(t, -6), to: t }) },
  { key: "14", label: "14 วัน", range: (t) => ({ from: addDays(t, -13), to: t }) },
  { key: "30", label: "30 วัน", range: (t) => ({ from: addDays(t, -29), to: t }) },
  { key: "90", label: "90 วัน", range: (t) => ({ from: addDays(t, -89), to: t }) },
  { key: "month", label: "เดือนนี้", range: (t) => ({ from: monthStart(t), to: t }) },
  {
    key: "last-month",
    label: "เดือนก่อน",
    range: (t) => {
      const lastDay = addDays(monthStart(t), -1);
      return { from: monthStart(lastDay), to: lastDay };
    },
  },
];

export function RangePicker({ from, to, today }: { from: string; to: string; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = React.useState({ from, to });
  const go = (range: { from: string; to: string }) => {
    if (!range.from || !range.to || range.from > range.to) return;
    router.push(`${pathname}?from=${range.from}&to=${range.to}`);
  };
  const active = PRESETS.find((p) => {
    const r = p.range(today);
    return r.from === from && r.to === to;
  })?.key;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-1" role="group" aria-label="ช่วงเวลาที่เลือกเร็ว">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            aria-pressed={active === preset.key}
            onClick={() => {
              const r = preset.range(today);
              setDraft(r);
              go(r);
            }}
            className={cn(
              "h-9 rounded-md border px-3 text-xs font-medium transition-colors",
              active === preset.key
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-fg-secondary hover:bg-surface-2",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <label className="flex items-center gap-1.5 text-xs text-fg-muted">
          จาก
          <input
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            onBlur={() => go(draft)}
            className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-fg"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-fg-muted">
          ถึง
          <input
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            max={today}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            onBlur={() => go(draft)}
            className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-fg"
          />
        </label>
      </div>
    </div>
  );
}

export function Kpi({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof ArrowDownToLine;
  tone: string;
}) {
  return (
    <Card className="min-w-0 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-fg-muted">{label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-md", tone)} aria-hidden="true">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-fg">{value}</p>
      <p className="mt-1 truncate text-xs text-fg-muted">{note}</p>
    </Card>
  );
}

export function Panel({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </Card>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-fg-muted">{children}</p>;
}

export function RankList({ rows, barClass }: { rows: MaterialsOverviewTop[]; barClass: string }) {
  if (rows.length === 0) return <Empty>ไม่มีรายการในช่วงเวลานี้</Empty>;
  const max = Math.max(...rows.map((r) => r.qty), 1);
  return (
    <ol className="divide-y divide-border">
      {rows.map((row, index) => (
        <li key={`${row.code}-${row.unit}`} className="px-5 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-sm text-fg">
              <span className="mr-2 text-xs text-fg-muted">{index + 1}</span>
              <span className="font-mono text-xs text-primary">{row.code}</span>
              <span className="ml-2 text-fg-secondary">{row.name}</span>
            </p>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-fg">
              {nf.format(row.qty)} <span className="text-xs font-normal text-fg-muted">{row.unit ?? ""}</span>
            </p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className={cn("h-full rounded-full", barClass)} style={{ width: `${Math.max(3, (row.qty / max) * 100)}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-fg-muted">{row.docs} เอกสาร</p>
        </li>
      ))}
    </ol>
  );
}

export function Split({ rows }: { rows: Array<{ label: string; qty: number; docs: number }> }) {
  if (rows.length === 0) return <Empty>ไม่มีรายการในช่วงเวลานี้</Empty>;
  const total = rows.reduce((s, r) => s + r.qty, 0) || 1;
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.label} className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-fg">{row.label}</p>
            <p className="text-[11px] text-fg-muted">{row.docs} เอกสาร</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums text-fg">{nf.format(row.qty)}</p>
            <p className="text-[11px] tabular-nums text-fg-muted">{Math.round((row.qty / total) * 100)}%</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export type TrendView = MovementChartKind | "table";
export const TREND_VIEWS: Array<{ key: TrendView; label: string; icon: typeof BarChart3 }> = [
  { key: "combo", label: "แท่ง + เส้นสะสม", icon: BarChart3 },
  { key: "area", label: "พื้นที่", icon: TrendingUp },
  { key: "line", label: "เส้น", icon: LineChart },
  { key: "net", label: "สุทธิรายวัน", icon: Scale },
  { key: "table", label: "ตาราง", icon: Table2 },
];

export function DailyTable({ days, access }: { days: MaterialsOverview["daily"]; access: MaterialsOverview["access"] }) {
  const [hideEmpty, setHideEmpty] = React.useState(true);
  const rows = hideEmpty ? days.filter((d) => d.receivedDocs + d.disbursedDocs > 0) : days;
  const sum = (key: keyof MaterialsOverview["daily"][number]) => days.reduce((t, d) => t + Number(d[key]), 0);
  return (
    <div>
      <label className="flex items-center gap-2 px-5 pb-2 text-xs text-fg-secondary">
        <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="size-3.5 accent-[var(--primary)]" />
        ซ่อนวันที่ไม่มีรายการ ({days.length - days.filter((d) => d.receivedDocs + d.disbursedDocs > 0).length} วัน)
      </label>
      <div className="max-h-[22rem] overflow-auto border-t border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่</TableHead>
              {access.receiving && <TableHead className="text-right">รับเข้า (เอกสาร)</TableHead>}
              {access.receiving && <TableHead className="text-right">รับเข้า (ปริมาณ)</TableHead>}
              {access.disbursement && <TableHead className="text-right">จ่ายออก (เอกสาร)</TableHead>}
              {access.disbursement && <TableHead className="text-right">จ่ายออก (ปริมาณ)</TableHead>}
              {access.receiving && access.disbursement && <TableHead className="text-right">สุทธิ</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-fg-muted">ไม่มีรายการในช่วงเวลานี้</TableCell>
              </TableRow>
            )}
            {rows.map((d) => {
              const net = d.receivedQty - d.disbursedQty;
              return (
                <TableRow key={d.date}>
                  <TableCell className="whitespace-nowrap font-medium">{formatThaiDate(d.date)}</TableCell>
                  {access.receiving && <TableCell className="text-right tabular-nums">{nf.format(d.receivedDocs)}</TableCell>}
                  {access.receiving && <TableCell className="text-right tabular-nums text-success-fg">{nf.format(d.receivedQty)}</TableCell>}
                  {access.disbursement && <TableCell className="text-right tabular-nums">{nf.format(d.disbursedDocs)}</TableCell>}
                  {access.disbursement && <TableCell className="text-right tabular-nums text-warning-fg">{nf.format(d.disbursedQty)}</TableCell>}
                  {access.receiving && access.disbursement && (
                    <TableCell className={cn("text-right font-medium tabular-nums", net < 0 ? "text-danger-fg" : "text-fg")}>{net > 0 ? "+" : ""}{nf.format(net)}</TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">รวม</TableCell>
              {access.receiving && <TableCell className="text-right font-semibold tabular-nums">{nf.format(sum("receivedDocs"))}</TableCell>}
              {access.receiving && <TableCell className="text-right font-semibold tabular-nums">{nf.format(sum("receivedQty"))}</TableCell>}
              {access.disbursement && <TableCell className="text-right font-semibold tabular-nums">{nf.format(sum("disbursedDocs"))}</TableCell>}
              {access.disbursement && <TableCell className="text-right font-semibold tabular-nums">{nf.format(sum("disbursedQty"))}</TableCell>}
              {access.receiving && access.disbursement && (
                <TableCell className="text-right font-semibold tabular-nums">{nf.format(sum("receivedQty") - sum("disbursedQty"))}</TableCell>
              )}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

// A ranking / breakdown panel that can switch between its list and a donut.
export function Breakdown({
  title,
  hint,
  rows,
  list,
}: {
  title: string;
  hint: string;
  rows: Array<{ label: string; qty: number }>;
  list: React.ReactNode;
}) {
  const [mode, setMode] = React.useState<"list" | "donut">("list");
  return (
    <Panel
      title={title}
      hint={hint}
      action={
        rows.length > 0 ? (
          <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="รูปแบบการแสดง">
            {([
              ["list", "รายการ", ListOrdered],
              ["donut", "สัดส่วน", PieChart],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                title={label}
                onClick={() => setMode(key)}
                className={cn("flex items-center gap-1 rounded px-2 py-1 text-xs font-medium", mode === key ? "bg-primary-soft text-primary" : "text-fg-secondary hover:bg-surface-2")}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        ) : null
      }
    >
      {mode === "donut" && rows.length > 0 ? <MaterialsDonut rows={rows} /> : list}
    </Panel>
  );
}

export function MaterialsMovementOverview({
  overview,
  today,
}: {
  overview: MaterialsOverview;
  today: string;
}) {
  const { range, totals, access } = overview;
  const [metric, setMetric] = React.useState<MovementMetric>("qty");
  const [trendView, setTrendView] = React.useState<TrendView>("combo");
  const [showReceived, setShowReceived] = React.useState(true);
  const [showDisbursed, setShowDisbursed] = React.useState(true);
  const net = totals.receivedQty - totals.disbursedQty;
  const received = access.receiving && showReceived;
  const disbursed = access.disbursement && showDisbursed;
  const pending = totals.receivingDraft + totals.disbursementDraft;
  const cancelled = totals.receivingCancelled + totals.disbursementCancelled;
  const hasData = totals.receivedDocs + totals.disbursedDocs > 0;

  return (
    <section className="flex flex-col gap-4" aria-label="รับเข้าและจ่ายออก">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
            <CalendarRange className="size-4 text-primary" aria-hidden="true" />
            รับเข้า – จ่ายออก
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            {formatThaiDate(range.from)} – {formatThaiDate(range.to)} · {range.days} วัน · นับเฉพาะเอกสารที่ยืนยันแล้ว
          </p>
        </div>
        <RangePicker key={`${range.from}-${range.to}`} from={range.from} to={range.to} today={today} />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label="รับเข้า"
          value={access.receiving ? nf.format(totals.receivedQty) : "—"}
          note={access.receiving ? `${nf.format(totals.receivedDocs)} เอกสาร` : "ไม่มีสิทธิ์ดูข้อมูลรับเข้า"}
          icon={ArrowDownToLine}
          tone="bg-success-soft text-success"
        />
        <Kpi
          label="จ่ายออก"
          value={access.disbursement ? nf.format(totals.disbursedQty) : "—"}
          note={access.disbursement ? `${nf.format(totals.disbursedDocs)} เอกสาร` : "ไม่มีสิทธิ์ดูข้อมูลจ่ายออก"}
          icon={ArrowUpFromLine}
          tone="bg-warning-soft text-warning"
        />
        <Kpi
          label="สุทธิ (รับ − จ่าย)"
          value={access.receiving && access.disbursement ? `${net > 0 ? "+" : ""}${nf.format(net)}` : "—"}
          note={net >= 0 ? "คลังเพิ่มขึ้นในช่วงนี้" : "คลังลดลงในช่วงนี้"}
          icon={Scale}
          tone="bg-primary-soft text-primary"
        />
        <Kpi
          label="ร่าง / ยกเลิก"
          value={`${nf.format(pending)} / ${nf.format(cancelled)}`}
          note="เอกสารที่ยังไม่นับในยอด"
          icon={FileClock}
          tone="bg-surface-2 text-fg-secondary"
        />
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
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium",
                    metric === m ? "bg-primary-soft text-primary" : "text-fg-secondary hover:bg-surface-2",
                  )}
                >
                  {m === "qty" ? "ปริมาณ" : "เอกสาร"}
                </button>
              ))}
            </div>
            {access.receiving && (
              <button
                type="button"
                aria-pressed={showReceived}
                onClick={() => setShowReceived((v) => !v)}
                className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", showReceived ? "border-success/40 bg-success-soft text-success-fg" : "border-border text-fg-muted")}
              >
                รับเข้า
              </button>
            )}
            {access.disbursement && (
              <button
                type="button"
                aria-pressed={showDisbursed}
                onClick={() => setShowDisbursed((v) => !v)}
                className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", showDisbursed ? "border-warning/40 bg-warning-soft text-warning-fg" : "border-border text-fg-muted")}
              >
                จ่ายออก
              </button>
            )}
          </div>
        }
      >
        <div className={trendView === "table" ? "pb-3 pt-3" : "px-3 pb-3 pt-4"}>
          {hasData && trendView === "table" ? (
            <DailyTable days={overview.daily} access={access} />
          ) : hasData && trendView !== "table" ? (
            <MaterialsMovementChart days={overview.daily} metric={metric} kind={trendView} showReceived={received} showDisbursed={disbursed} />
          ) : (
            <Empty>ยังไม่มีเอกสารรับเข้าหรือจ่ายออกที่ยืนยันแล้วในช่วงเวลานี้ — ลองเลือกช่วงวันที่กว้างขึ้น</Empty>
          )}
        </div>
      </Panel>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {access.receiving && (
          <Breakdown
            title="วัสดุที่รับเข้ามากที่สุด"
            hint="Top 8 ตามปริมาณ"
            rows={overview.topReceived.map((r) => ({ label: `${r.code} ${r.name}`, qty: r.qty }))}
            list={<RankList rows={overview.topReceived} barClass="bg-chart-2" />}
          />
        )}
        {access.disbursement && (
          <Breakdown
            title="วัสดุที่จ่ายออกมากที่สุด"
            hint="Top 8 ตามปริมาณ"
            rows={overview.topDisbursed.map((r) => ({ label: `${r.code} ${r.name}`, qty: r.qty }))}
            list={<RankList rows={overview.topDisbursed} barClass="bg-chart-3" />}
          />
        )}
        {access.receiving && (
          <Breakdown
            title="ผู้จัดจำหน่ายที่ส่งมอบ"
            hint="ตามปริมาณรับเข้า"
            rows={overview.bySupplier.map((s) => ({ label: s.name, qty: s.qty }))}
            list={<Split rows={overview.bySupplier.map((s) => ({ label: s.name, qty: s.qty, docs: s.docs }))} />}
          />
        )}
        {access.disbursement && (
          <Breakdown
            title="จ่ายออกตามประเภท"
            hint="เบิกเพื่อผลิต เทียบกับตัดสต็อก"
            rows={overview.byDisbursementType.map((t) => ({ label: TYPE_LABEL[t.type] ?? t.type, qty: t.qty }))}
            list={<Split rows={overview.byDisbursementType.map((t) => ({ label: TYPE_LABEL[t.type] ?? t.type, qty: t.qty, docs: t.docs }))} />}
          />
        )}
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {access.receiving && (
          <Panel
            title="รายการรับเข้า"
            hint="ล่าสุดในช่วงเวลาที่เลือก"
            action={
              <Link href="/materials/receiving" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                ทั้งหมด <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            }
          >
            {overview.recentReceivings.length === 0 ? (
              <Empty>ไม่มีรายการรับเข้า</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {overview.recentReceivings.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-fg">
                        <span className="font-mono text-xs text-primary">{r.materialCode}</span>
                        <span className="ml-2 text-fg-secondary">{r.materialName}</span>
                      </p>
                      <p className="truncate text-[11px] text-fg-muted">
                        <span className="font-mono">{r.lotNo}</span> · {r.supplier ?? "ไม่ระบุผู้จัดจำหน่าย"} · {formatThaiDate(r.date)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-success-fg">
                      +{nf.format(r.qty)} <span className="text-xs font-normal text-fg-muted">{r.unit ?? ""}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        {access.disbursement && (
          <Panel
            title="รายการจ่ายออก"
            hint="ล่าสุดในช่วงเวลาที่เลือก"
            action={
              <Link href="/materials/disbursements" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                ทั้งหมด <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            }
          >
            {overview.recentDisbursements.length === 0 ? (
              <Empty>ไม่มีรายการจ่ายออก</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {overview.recentDisbursements.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-fg">
                        <span className="font-mono text-xs text-primary">{d.documentNo}</span>
                        <Badge variant="neutral" className="ml-2">{TYPE_LABEL[d.type] ?? d.type}</Badge>
                      </p>
                      <p className="truncate text-[11px] text-fg-muted">
                        {d.items} รายการ{d.firstMaterial ? ` · ${d.firstMaterial}${d.items > 1 ? " และอื่นๆ" : ""}` : ""} · {formatThaiDate(d.date)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-warning-fg">−{nf.format(d.qty)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>
    </section>
  );
}
