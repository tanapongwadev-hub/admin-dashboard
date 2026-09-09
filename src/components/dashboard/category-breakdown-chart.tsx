"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { materialCategoryBreakdown, type MaterialCategoryShare } from "@/lib/dashboard-data";
import { DashboardEmptyState } from "@/components/dashboard/chart-card";
import { formatWeight } from "@/lib/utils";

// `data` defaults to every category, so an existing bare <CategoryBreakdownChart />
// renders exactly as before; the dashboard narrows it via the category filter.
export function CategoryBreakdownChart({ data = materialCategoryBreakdown }: { data?: MaterialCategoryShare[] }) {
  const total = data.reduce((s, t) => s + t.value, 0);

  if (data.length === 0) {
    return (
      <DashboardEmptyState
        icon={PieChartIcon}
        title="ไม่มีข้อมูลหมวดหมู่"
        description="ไม่มีหมวดหมู่วัสดุที่ตรงกับตัวกรองที่เลือก ลองล้างตัวกรองหมวดหมู่"
      />
    );
  }

  // Always stacked, never side-by-side: this card sits in a 1-of-3 grid
  // column, so a row layout squeezes the legend until category names
  // truncate to nothing (the donut alone is ~168px of the ~300px card).
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative shrink-0">
        <ResponsiveContainer width={168} height={168}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry) => (
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
          <span className="text-[11px] text-fg-muted">คงเหลือในสต็อก</span>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-2.5">
        {data.map((source) => (
          <div key={source.name} className="flex items-center justify-between gap-2 text-[13px]">
            <div className="flex min-w-0 items-center gap-2 text-fg-secondary">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: `var(--${source.color})` }}
                aria-hidden="true"
              />
              <span className="truncate">{source.name}</span>
            </div>
            <span className="flex shrink-0 items-baseline gap-1.5">
              {/* Share is the point of a donut, so it's stated in text too —
                  the slice angle alone isn't readable to a fraction of a
                  percent, and it isn't accessible without hovering. */}
              <span className="tabular-nums text-xs text-fg-muted">
                {total > 0 ? `${Math.round((source.value / total) * 100)}%` : "—"}
              </span>
              <span className="font-semibold tabular-nums text-fg">{formatWeight(source.value)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
