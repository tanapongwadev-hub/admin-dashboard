"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { categoryPerformance } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

const colors = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

export function CategoryChart() {
  const data = categoryPerformance();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "var(--fg-muted)", fontSize: 12 }} tickFormatter={(v) => formatNumber(v)} />
        <YAxis
          type="category"
          dataKey="category"
          axisLine={false}
          tickLine={false}
          width={110}
          tick={{ fill: "var(--fg-secondary)", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          formatter={(value) => [formatNumber(Number(value)), "จำนวนที่ขาย"]}
        />
        <Bar dataKey="sales" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((_, i) => (
            <Cell key={i} fill={`var(--${colors[i % colors.length]})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
