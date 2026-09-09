"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// The mock trend series is 14 days long (see src/lib/dashboard-data.ts), so
// these are the only two windows that can be shown honestly — no "30 วัน"
// option that would silently render the same 14 points.
export type TrendRange = "7" | "14";

export const TREND_RANGE_OPTIONS: { value: TrendRange; label: string }[] = [
  { value: "7", label: "7 วันล่าสุด" },
  { value: "14", label: "14 วันล่าสุด" },
];

export function DashboardHeader({
  greeting,
  needsAttention,
  lowStockCount,
  range,
  onRangeChange,
  onOpenFilters,
  activeFilterCount,
  onExport,
}: {
  greeting: string;
  needsAttention: boolean;
  lowStockCount: number;
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  onExport: () => void;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  // No breadcrumb here on purpose — the app shell's Topbar already renders one
  // for every dashboard route (see layout/topbar.tsx#useBreadcrumb); a second
  // one on the page itself would just be the same trail twice.
  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-fg">แดชบอร์ด</h1>
        <p className="mt-1 text-sm text-fg-muted">{greeting} · ภาพรวมความเคลื่อนไหวบนพื้นโรงงานวันนี้</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-[12px] font-medium",
            needsAttention
              ? "border-warning/30 bg-warning-soft text-warning"
              : "border-success/30 bg-success-soft text-success"
          )}
        >
          <span className="relative flex size-1.5" aria-hidden="true">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-70",
                needsAttention ? "bg-warning" : "bg-success"
              )}
            />
            <span className={cn("relative inline-flex size-1.5 rounded-full", needsAttention ? "bg-warning" : "bg-success")} />
          </span>
          {needsAttention ? `วัสดุ ${lowStockCount} รายการต้องการความสนใจ` : "ทุกสายการผลิตปกติ"}
        </span>

        <div className="w-[150px]">
          <label htmlFor="dashboard-range" className="sr-only">
            ช่วงเวลาของกราฟแนวโน้ม
          </label>
          <Select value={range} onValueChange={(next) => onRangeChange(next as TrendRange)}>
            <SelectTrigger id="dashboard-range" className="text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TREND_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-9 lg:hidden"
          onClick={onOpenFilters}
          aria-label={`เปิดตัวกรอง${activeFilterCount > 0 ? ` (ใช้งานอยู่ ${activeFilterCount} รายการ)` : ""}`}
        >
          <SlidersHorizontal className="size-3.5" />
          ตัวกรอง
          {activeFilterCount > 0 && (
            <span className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary-soft px-1 text-[10px] font-semibold tabular-nums text-primary">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={isRefreshing}
          aria-label="รีเฟรชข้อมูล"
        >
          <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
          <span className="hidden sm:inline">{isRefreshing ? "กำลังรีเฟรช" : "รีเฟรช"}</span>
        </Button>

        <Button variant="outline" size="sm" className="h-9" onClick={onExport}>
          <Download className="size-3.5" />
          <span className="hidden sm:inline">ส่งออก CSV</span>
        </Button>
      </div>
    </header>
  );
}
