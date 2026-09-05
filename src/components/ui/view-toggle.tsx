"use client";

import { LayoutGrid, Rows3, Table2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/hooks/use-view-mode";

// Per-mode UI config kept in one place so adding a new mode (e.g. a future
// "kanban") is one entry here + one switch branch in the consumer.
const MODE_CONFIG: Record<ViewMode, { icon: LucideIcon; label: string }> = {
  table: { icon: Table2, label: "มุมมองตาราง" },
  card: { icon: LayoutGrid, label: "มุมมองการ์ด" },
  list: { icon: Rows3, label: "มุมมองรายการ" },
};

// Generic table/card/list view switcher — pairs with useViewMode(). Any list
// page can adopt it: keep its own view state via useViewMode("<page-key>"),
// render <ViewToggle value={view} onChange={setView} modes={[…]} />, and
// switch between its own renderers based on `view`. The `modes` prop is the
// set of buttons to render — defaults to table + card so existing pages
// (e.g. Products) are unaffected when we add new modes to ViewMode.
export function ViewToggle({
  value,
  onChange,
  modes = ["table", "card"],
  className,
}: {
  value: ViewMode;
  onChange: (view: ViewMode) => void;
  modes?: readonly ViewMode[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface p-1", className)}>
      {modes.map((mode) => {
        const { icon: Icon, label } = MODE_CONFIG[mode];
        return (
          <button
            key={mode}
            type="button"
            aria-label={label}
            aria-pressed={value === mode}
            title={label}
            onClick={() => onChange(mode)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:text-fg",
              value === mode && "bg-primary-soft text-primary hover:text-primary"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
