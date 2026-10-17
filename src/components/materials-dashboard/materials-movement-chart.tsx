"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MaterialsOverviewDay } from "@/lib/api/materials-dashboard";

export type MovementMetric = "qty" | "docs";

const nf = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function shortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(day)}/${Number(month)}`;
}

// Daily received vs disbursed. Bars show each day, the line is the running net
// (received - disbursed) over the selected range.
export function MaterialsMovementChart({
  days,
  metric,
  showReceived,
  showDisbursed,
}: {
  days: MaterialsOverviewDay[];
  metric: MovementMetric;
  showReceived: boolean;
  showDisbursed: boolean;
}) {
  let running = 0;
  const data = days.map((d) => {
    const received = metric === "qty" ? d.receivedQty : d.receivedDocs;
    const disbursed = metric === "qty" ? d.disbursedQty : d.disbursedDocs;
    running += (showReceived ? received : 0) - (showDisbursed ? disbursed : 0);
    return { date: d.date, received, disbursed, net: running };
  });
  const interval = data.length > 31 ? Math.ceil(data.length / 15) - 1 : data.length > 12 ? 1 : 0;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
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
        {showReceived && showDisbursed && (
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
          contentStyle={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
          labelStyle={{ color: "var(--fg)", fontWeight: 600, marginBottom: 4 }}
          labelFormatter={(label) => String(label)}
          formatter={(value, name) => [nf.format(Number(value)), String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {showReceived && <Bar yAxisId="left" dataKey="received" name="รับเข้า" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={22} />}
        {showDisbursed && <Bar yAxisId="left" dataKey="disbursed" name="จ่ายออก" fill="var(--chart-3)" radius={[3, 3, 0, 0]} maxBarSize={22} />}
        {showReceived && showDisbursed && (
          <Line yAxisId="right" type="monotone" dataKey="net" name="สุทธิสะสม (แกนขวา)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
