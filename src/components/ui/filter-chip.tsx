"use client";

import { X } from "lucide-react";

// Generic removable filter chip — used by any list page's active-filter row
// (currently Materials PC; reuse as-is for the next data table that needs
// one, don't hand-roll a new chip markup per page).
export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-3 pr-1.5 text-xs font-medium text-fg-secondary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`ลบตัวกรอง ${label}`}
        className="flex size-4 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
