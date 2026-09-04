"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { revenueTrend } from "@/lib/data";
import { formatCompact, formatCurrency } from "@/lib/utils";

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={revenueTrend} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
          dy={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
          tickFormatter={(v) => formatCompact(v)}
          width={44}
        />
        <Tooltip
          cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
          contentStyle={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
          labelStyle={{ color: "var(--fg)", fontWeight: 600, marginBottom: 4 }}
          formatter={(value, name) => [formatCurrency(Number(value)), name === "revenue" ? "รายได้" : "ค่าใช้จ่าย"]}
        />
        <Area type="monotone" dataKey="expenses" stroke="var(--chart-2)" strokeWidth={2} fill="url(#expenseFill)" />
        <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
