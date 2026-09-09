"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { weeklyThroughput } from "@/lib/dashboard-data";
import { formatWeight } from "@/lib/utils";

// The legend moved out of the chart and into the enclosing ChartCard's header
// (see chart-card.tsx#ChartLegendItem) so both chart cards on this dashboard
// present their series key the same way, in the same place.
export function WeeklyThroughputChart({ height = 232 }: { height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={weeklyThroughput} margin={{ top: 10, right: 8, left: -12, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--fg-muted)", fontSize: 12 }} dy={8} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
          tickFormatter={(v) => formatWeight(v)}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          contentStyle={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="received" name="รับเข้า" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="disbursed" name="เบิกออก" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
