import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <span
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ backgroundColor: `var(--${accent})` }}
      />
      <div className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-fg-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-fg">{value}</p>
          <div className="mt-2 flex items-center gap-1">
            <span
              className={cn(
                "flex items-center gap-0.5 rounded text-xs font-medium",
                trend === "up" ? "text-success" : "text-danger"
              )}
            >
              {trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {change}
            </span>
            <span className="text-xs text-fg-muted">เทียบกับเดือนที่แล้ว</span>
          </div>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in oklab, var(--${accent}) 16%, transparent)`, color: `var(--${accent})` }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </Card>
  );
}
