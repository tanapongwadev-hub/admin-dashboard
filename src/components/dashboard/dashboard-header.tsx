"use client";
import { PageTitle } from "@/components/ui/page-title";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// The loader fetches 14 days (lib/dashboard-loader.ts TREND_DAYS), so these
// are the only two windows that can be shown honestly.
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
  healthAvailable,
  loadedAt,
  failedSources,
}: {
  greeting: string;
  needsAttention: boolean;
  lowStockCount: number;
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  healthAvailable: boolean;
  loadedAt: string;
  failedSources: string[];
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  // No breadcrumb here on purpose — the app shell's Topbar already renders one
  // for every dashboard route (see layout/topbar.tsx#useBreadcrumb); a second
  // one on the page itself would just be the same trail twice.
  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-start xl:justify-between">
      <div className="min-w-0">
        <PageTitle>แดชบอร์ด</PageTitle>
        <p className="mt-1 text-sm text-fg-muted">{greeting} · ดึงข้อมูลเมื่อ {new Date(loadedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-medium",
            !healthAvailable ? "border-border bg-surface-2 text-fg-muted" : needsAttention
              ? "border-warning/30 bg-warning-soft text-warning-fg"
              : "border-success/30 bg-success-soft text-success-fg"
          )}
        >
          {!healthAvailable ? "ยังประเมินสต็อกไม่ได้" : needsAttention ? `วัสดุ ${lowStockCount} รายการต้องการความสนใจ` : "สต็อกวัสดุไม่พบรายการต่ำกว่าขั้นต่ำ"}
        </span>

        <div className="w-[150px]">
          <label htmlFor="dashboard-range" className="sr-only">
            ช่วงเวลาของกราฟแนวโน้ม
          </label>
          <Select value={range} onValueChange={(next) => onRangeChange(next as TrendRange)}>
            <SelectTrigger id="dashboard-range" className="text-sm">
              {/* Explicit label so SSR (before Radix mounts the items) is not blank. */}
              <SelectValue>{TREND_RANGE_OPTIONS.find((o) => o.value === range)?.label}</SelectValue>
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
          className="h-9"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={isRefreshing}
          aria-label="รีเฟรชข้อมูล"
        >
          <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
          <span className="hidden sm:inline">{isRefreshing ? "กำลังรีเฟรช" : "รีเฟรช"}</span>
        </Button>


      </div>
      {failedSources.length > 0 && <p role="alert" className="w-full rounded-md border border-warning/30 bg-warning-soft p-3 text-sm text-warning-fg">โหลด{failedSources.join(" / ")}ไม่สำเร็จ ข้อมูลบางส่วนยังไม่พร้อมใช้งาน กดรีเฟรชเพื่อลองใหม่</p>}
    </header>
  );
}
