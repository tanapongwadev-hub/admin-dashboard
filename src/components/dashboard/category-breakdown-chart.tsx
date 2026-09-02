"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { materialCategoryBreakdown } from "@/lib/dashboard-data";
import { formatWeight } from "@/lib/utils";

export function CategoryBreakdownChart() {
  const total = materialCategoryBreakdown.reduce((s, t) => s + t.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <ResponsiveContainer width={168} height={168}>
          <PieChart>
            <Pie
              data={materialCategoryBreakdown}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={3}
              stroke="none"
            >
              {materialCategoryBreakdown.map((entry) => (
                <Cell key={entry.name} fill={`var(--${entry.color})`} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) => [formatWeight(Number(value)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-nums text-fg">{formatWeight(total)}</span>
          <span className="text-[11px] text-fg-muted">on hand</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5">
        {materialCategoryBreakdown.map((source) => (
          <div key={source.name} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 text-fg-secondary">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: `var(--${source.color})` }} />
              {source.name}
            </div>
            <span className="tabular-nums font-medium text-fg">{formatWeight(source.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
