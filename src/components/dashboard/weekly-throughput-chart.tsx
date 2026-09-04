"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { weeklyThroughput } from "@/lib/dashboard-data";
import { formatWeight } from "@/lib/utils";

export function WeeklyThroughputChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
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
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "var(--fg-secondary)" }}
        />
        <Bar dataKey="received" name="รับเข้า" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="disbursed" name="เบิกออก" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
