"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/hooks/use-view-mode";

// Generic table/card view switcher — pairs with useViewMode(). Any list
// page can adopt it: keep its own view state via useViewMode("<page-key>"),
// render <ViewToggle value={view} onChange={setView} />, and switch between
// its own table/card renderers based on `view`. Not tied to materials.
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ViewMode;
  onChange: (view: ViewMode) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface p-1", className)}>
      <button
        type="button"
        aria-label="มุมมองตาราง"
        aria-pressed={value === "table"}
        title="มุมมองตาราง"
        onClick={() => onChange("table")}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:text-fg",
          value === "table" && "bg-primary-soft text-primary hover:text-primary"
        )}
      >
        <Table2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="มุมมองการ์ด"
        aria-pressed={value === "card"}
        title="มุมมองการ์ด"
        onClick={() => onChange("card")}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:text-fg",
          value === "card" && "bg-primary-soft text-primary hover:text-primary"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
