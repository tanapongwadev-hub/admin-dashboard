"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MaterialsOverviewDay } from "@/lib/api/materials-dashboard";

export type MovementMetric = "qty" | "docs";
export type MovementChartKind = "combo" | "area" | "line" | "net";

const nf = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function shortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(day)}/${Number(month)}`;
}

const tooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
};

// Daily received vs disbursed in four renderings of the same data:
//  combo — bars per day + running net line (right axis)
//  area  — filled areas
//  line  — plain lines with dots
//  net   — one bar per day of received − disbursed (green up, red down)
export function MaterialsMovementChart({
  days,
  metric,
  kind,
  showReceived,
  showDisbursed,
}: {
  days: MaterialsOverviewDay[];
  metric: MovementMetric;
  kind: MovementChartKind;
  showReceived: boolean;
  showDisbursed: boolean;
}) {
  let running = 0;
  const data = days.map((d) => {
    const received = metric === "qty" ? d.receivedQty : d.receivedDocs;
    const disbursed = metric === "qty" ? d.disbursedQty : d.disbursedDocs;
    running += (showReceived ? received : 0) - (showDisbursed ? disbursed : 0);
    return { date: d.date, received, disbursed, net: running, daily: received - disbursed };
  });
  const interval = data.length > 31 ? Math.ceil(data.length / 15) - 1 : data.length > 12 ? 1 : 0;
  const both = showReceived && showDisbursed;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="mvReceived" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="mvDisbursed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
          dy={8}
          interval={interval}
        />
        <YAxis
          yAxisId="left"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
          tickFormatter={(v) => nf.format(Number(v))}
          width={56}
          allowDecimals={metric === "qty"}
        />
        {kind === "combo" && both && (
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--chart-1)", fontSize: 12 }}
            tickFormatter={(v) => nf.format(Number(v))}
            width={56}
            allowDecimals={false}
          />
        )}
        <Tooltip
          cursor={{ fill: "var(--surface-2)", opacity: 0.6 }}
          contentStyle={tooltipStyle}
          labelStyle={{ color: "var(--fg)", fontWeight: 600, marginBottom: 4 }}
          formatter={(value, name) => [nf.format(Number(value)), String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

        {kind === "combo" && (
          <>
            {showReceived && <Bar yAxisId="left" dataKey="received" name="รับเข้า" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={22} />}
            {showDisbursed && <Bar yAxisId="left" dataKey="disbursed" name="จ่ายออก" fill="var(--chart-3)" radius={[3, 3, 0, 0]} maxBarSize={22} />}
            {both && <Line yAxisId="right" type="monotone" dataKey="net" name="สุทธิสะสม (แกนขวา)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />}
          </>
        )}
        {kind === "area" && (
          <>
            {showDisbursed && <Area yAxisId="left" type="monotone" dataKey="disbursed" name="จ่ายออก" stroke="var(--chart-3)" strokeWidth={2} fill="url(#mvDisbursed)" />}
            {showReceived && <Area yAxisId="left" type="monotone" dataKey="received" name="รับเข้า" stroke="var(--chart-2)" strokeWidth={2.5} fill="url(#mvReceived)" />}
          </>
        )}
        {kind === "line" && (
          <>
            {showReceived && <Line yAxisId="left" type="monotone" dataKey="received" name="รับเข้า" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />}
            {showDisbursed && <Line yAxisId="left" type="monotone" dataKey="disbursed" name="จ่ายออก" stroke="var(--chart-3)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />}
          </>
        )}
        {kind === "net" && (
          <>
            <ReferenceLine yAxisId="left" y={0} stroke="var(--border-strong)" />
            <Bar yAxisId="left" dataKey="daily" name="สุทธิรายวัน (รับ − จ่าย)" radius={[3, 3, 0, 0]} maxBarSize={22}>
              {data.map((d) => (
                <Cell key={d.date} fill={d.daily >= 0 ? "var(--chart-2)" : "var(--danger)"} />
              ))}
            </Bar>
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--info)",
  "var(--danger)",
  "var(--success)",
];

// Share-of-total donut used by the ranking / breakdown panels.
export function MaterialsDonut({ rows }: { rows: Array<{ label: string; qty: number }> }) {
  const total = rows.reduce((sum, r) => sum + r.qty, 0) || 1;
  return (
    <div className="grid items-center gap-3 px-5 py-4 sm:grid-cols-[11rem_1fr]">
      <div className="mx-auto h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="qty" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="var(--surface)">
              {rows.map((r, i) => (
                <Cell key={r.label} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [nf.format(Number(value)), String(name)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="truncate text-fg-secondary" title={r.label}>{r.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-fg">
              {nf.format(r.qty)} <span className="text-fg-muted">({Math.round((r.qty / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
