import { lowStockWatchlist } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

export function LowStockWatchlist() {
  return (
    <div className="flex flex-col gap-4">
      {lowStockWatchlist.map((item) => {
        const ratio = item.qty / item.reorderPoint;
        const critical = ratio < 0.5;
        return (
          <div key={item.code} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[10px] font-semibold text-fg-secondary">
              {item.code.slice(-4)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-fg">{item.name}</p>
                <p className="shrink-0 text-sm tabular-nums text-fg-muted">
                  {item.qty.toLocaleString()} / {item.reorderPoint.toLocaleString()} {item.unit}
                </p>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cn("h-full rounded-full", critical ? "bg-danger" : "bg-warning")}
                    style={{ width: `${Math.max(6, Math.min(100, ratio * 100))}%` }}
                  />
                </div>
                <span className={cn("shrink-0 text-xs", critical ? "text-danger" : "text-warning")}>
                  {critical ? "Reorder now" : "Below reorder point"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
