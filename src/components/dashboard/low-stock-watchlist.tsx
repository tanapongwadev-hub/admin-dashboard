import Link from "next/link";
import { PackageCheck } from "lucide-react";
import { lowStockWatchlist, type WatchlistItem } from "@/lib/dashboard-data";
import { DashboardEmptyState } from "@/components/dashboard/chart-card";
import { cn } from "@/lib/utils";

// `items` defaults to the full watchlist so a bare <LowStockWatchlist /> is
// unchanged; the dashboard passes its search-filtered subset.
export function LowStockWatchlist({ items = lowStockWatchlist, canViewCatalog = false, canViewReceiving = false }: { items?: WatchlistItem[]; canViewCatalog?: boolean; canViewReceiving?: boolean }) {
  if (items.length === 0) {
    return (
      <DashboardEmptyState
        icon={PackageCheck}
        title="ไม่มีรายการเฝ้าระวัง"
        description="ไม่พบวัสดุที่หมดสต็อกหรือต่ำกว่าสต็อกขั้นต่ำ"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => {
        const ratio = item.reorderPoint > 0 ? item.qty / item.reorderPoint : 0;
        const critical = ratio < 0.5;
        return (
          <div key={item.code} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-fg">{item.name}</p>
                <p className="shrink-0 text-sm tabular-nums text-fg-muted">
                  {item.qty.toLocaleString()} / {item.reorderPoint.toLocaleString()} {item.unit}
                </p>
              </div>
              <p className="break-all text-xs text-fg-muted">{item.code}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {canViewCatalog && <Link className="inline-flex min-h-6 items-center text-primary underline underline-offset-4 pointer-coarse:min-h-11" href={`/materials/catalog?search=${encodeURIComponent(item.code)}`}>ดูวัสดุ</Link>}
                {canViewReceiving && <Link className="inline-flex min-h-6 items-center text-primary underline underline-offset-4 pointer-coarse:min-h-11" href={`/materials/receiving?materialCode=${encodeURIComponent(item.code)}`}>ดูการรับเข้า</Link>}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cn("h-full rounded-full", critical ? "bg-danger" : "bg-warning")}
                    style={{ width: `${Math.max(6, Math.min(100, ratio * 100))}%` }}
                  />
                </div>
                <span className={cn("shrink-0 text-xs", critical ? "text-danger" : "text-warning")}>
                  {item.qty <= 0 ? "หมดสต็อก" : critical ? "ต้องสั่งซื้อด่วน" : "ต่ำกว่าจุดสั่งซื้อ"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
