"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { StockDocStatus, StockDocType } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

// Filter state is entirely client-side over the mock arrays this dashboard
// already renders (see src/lib/dashboard-data.ts) — there is no server-side
// filter endpoint for this page, and this deliberately doesn't invent one.
// Everything here narrows data the page had already loaded.
export interface DashboardFilterState {
  search: string;
  docTypes: StockDocType[];
  statuses: StockDocStatus[];
  categories: string[];
}

export const EMPTY_FILTERS: DashboardFilterState = {
  search: "",
  docTypes: [],
  statuses: [],
  categories: [],
};

export function countActiveFilters(filters: DashboardFilterState): number {
  return (
    (filters.search.trim() ? 1 : 0) +
    filters.docTypes.length +
    filters.statuses.length +
    filters.categories.length
  );
}

const DOC_TYPE_OPTIONS: { value: StockDocType; label: string }[] = [
  { value: "Receiving", label: "รับเข้า" },
  { value: "Disbursement", label: "เบิกจ่าย" },
];

const STATUS_OPTIONS: { value: StockDocStatus; label: string }[] = [
  { value: "Confirmed", label: "ยืนยันแล้ว" },
  { value: "Draft", label: "ร่าง" },
  { value: "Cancelled", label: "ยกเลิก" },
];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

export function DashboardFilters({
  value,
  onChange,
  categoryOptions,
  className,
  headerClassName,
  idPrefix = "dash-filter",
}: {
  value: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
  categoryOptions: string[];
  className?: string;
  // The drawer instance needs right padding on the header row so the "ล้าง"
  // button clears the Sheet's own absolutely-positioned close button.
  headerClassName?: string;
  // Distinguishes the sidebar instance from the mobile drawer instance so the
  // two never render duplicate DOM ids for the same checkbox.
  idPrefix?: string;
}) {
  const activeCount = countActiveFilters(value);

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className={cn("flex items-center justify-between gap-2 border-b border-border px-4 py-3", headerClassName)}>
        <h2 className="text-sm font-semibold text-fg">
          ตัวกรอง
          {activeCount > 0 && (
            <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
              {activeCount}
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 h-7 px-2 text-xs text-fg-secondary"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            <X className="size-3.5" /> ล้าง
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-5 px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-search`} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
            ค้นหา
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-muted"
              aria-hidden="true"
            />
            <Input
              id={`${idPrefix}-search`}
              value={value.search}
              onChange={(event) => onChange({ ...value, search: event.target.value })}
              placeholder="เอกสาร, วัสดุ, ผู้จัดจำหน่าย"
              className="h-9 pl-8 text-[13px]"
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">ประเภทเอกสาร</legend>
          {DOC_TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              htmlFor={`${idPrefix}-type-${option.value}`}
              className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-secondary transition-colors hover:text-fg"
            >
              <Checkbox
                id={`${idPrefix}-type-${option.value}`}
                checked={value.docTypes.includes(option.value)}
                onCheckedChange={() => onChange({ ...value, docTypes: toggle(value.docTypes, option.value) })}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">สถานะ</legend>
          {STATUS_OPTIONS.map((option) => (
            <label
              key={option.value}
              htmlFor={`${idPrefix}-status-${option.value}`}
              className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-secondary transition-colors hover:text-fg"
            >
              <Checkbox
                id={`${idPrefix}-status-${option.value}`}
                checked={value.statuses.includes(option.value)}
                onCheckedChange={() => onChange({ ...value, statuses: toggle(value.statuses, option.value) })}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">หมวดหมู่วัสดุ</legend>
          {categoryOptions.map((category) => (
            <label
              key={category}
              htmlFor={`${idPrefix}-cat-${category}`}
              className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-secondary transition-colors hover:text-fg"
            >
              <Checkbox
                id={`${idPrefix}-cat-${category}`}
                checked={value.categories.includes(category)}
                onCheckedChange={() => onChange({ ...value, categories: toggle(value.categories, category) })}
              />
              <span className="min-w-0 truncate">{category}</span>
            </label>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
