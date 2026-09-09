"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Boxes, CircleCheck, CircleGauge, TriangleAlert } from "lucide-react";
import type { MaterialInventorySummary, MaterialStockStatus } from "@/lib/api/materials";
import { cn } from "@/lib/utils";

const cards: Array<{
  key: keyof MaterialInventorySummary;
  label: string;
  status: MaterialStockStatus | null;
  icon: typeof Boxes;
  tone: string;
}> = [
  { key: "total", label: "วัสดุทั้งหมด", status: null, icon: Boxes, tone: "text-primary bg-primary-soft" },
  { key: "normal", label: "สต็อกปกติ", status: "NORMAL", icon: CircleCheck, tone: "text-success bg-success-soft" },
  { key: "lowStock", label: "สต็อกต่ำ", status: "LOW_STOCK", icon: CircleGauge, tone: "text-warning bg-warning-soft" },
  { key: "outOfStock", label: "หมดสต็อก", status: "OUT_OF_STOCK", icon: TriangleAlert, tone: "text-danger bg-danger-soft" },
];

export function MaterialPcInventorySummary({ summary }: { summary: MaterialInventorySummary }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("stockStatus");

  function select(status: MaterialStockStatus | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set("stockStatus", status);
    else params.delete("stockStatus");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="ภาพรวมสถานะสต็อก">
      {cards.map((card) => {
        const Icon = card.icon;
        const selected = active === card.status || (!active && card.status === null);
        return (
          <button
            key={card.key}
            type="button"
            aria-pressed={selected}
            onClick={() => select(card.status)}
            className={cn(
              "flex min-h-24 items-center gap-3 rounded-md border bg-surface p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary-soft/20",
              selected ? "border-primary ring-1 ring-primary/15" : "border-border"
            )}
          >
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", card.tone)}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-semibold tabular-nums text-fg">{summary[card.key]}</span>
              <span className="block truncate text-xs text-fg-muted">{card.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
