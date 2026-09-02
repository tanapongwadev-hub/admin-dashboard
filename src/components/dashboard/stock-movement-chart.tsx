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
import { stockMovementTrend } from "@/lib/dashboard-data";
import { formatWeight } from "@/lib/utils";

export function StockMovementChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={stockMovementTrend} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="receivedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="disbursedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
          dy={8}
          interval={2}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
          tickFormatter={(v) => formatWeight(v)}
          width={52}
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
          formatter={(value, name) => [formatWeight(Number(value)), name === "received" ? "Received" : "Disbursed"]}
        />
        <Area type="monotone" dataKey="disbursed" stroke="var(--chart-3)" strokeWidth={2} fill="url(#disbursedFill)" />
        <Area type="monotone" dataKey="received" stroke="var(--chart-2)" strokeWidth={2.5} fill="url(#receivedFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
