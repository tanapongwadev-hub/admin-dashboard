"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { SearchInput } from "@/components/ui/search-input";
import {
  buildMaterialJobOrdersChips,
  readMaterialJobOrdersFilters,
  type MaterialJobOrdersFilterState,
} from "@/lib/filters/material-job-orders-filters";

const STATUS_OPTIONS = [
  { value: "WAITING_PICKING", label: "รอหยิบสินค้า" },
  { value: "READY_TO_ISSUE", label: "พร้อมจ่ายออก" },
  { value: "PARTIALLY_ISSUED", label: "จ่ายออกบางส่วน" },
  { value: "ISSUED", label: "จ่ายออกครบแล้ว" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

const FILTER_KEYS: (keyof MaterialJobOrdersFilterState)[] = [
  "search",
  "status",
  "approvedDateFrom",
  "approvedDateTo",
];

export function MaterialJobOrderFilters({ totalItems }: { totalItems: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = readMaterialJobOrdersFilters(params);
  const [search, setSearch] = React.useState(filters.search);

  function update(
    next: Partial<Record<keyof MaterialJobOrdersFilterState, string | null>>,
  ) {
    const target = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, value]) =>
      value ? target.set(key, value) : target.delete(key),
    );
    target.delete("page");
    router.push(`${pathname}?${target}`);
  }

  React.useEffect(() => {
    const id = setTimeout(() => {
      if (search === filters.search) return;
      const target = new URLSearchParams(params.toString());
      if (search) target.set("search", search);
      else target.delete("search");
      target.delete("page");
      router.push(`${pathname}?${target}`);
    }, 300);
    return () => clearTimeout(id);
  }, [filters.search, params, pathname, router, search]);

  function clearAll() {
    setSearch("");
    const target = new URLSearchParams(params.toString());
    [...FILTER_KEYS, "page"].forEach((key) => target.delete(key));
    router.push(`${pathname}?${target}`);
  }

  const chips = buildMaterialJobOrdersChips(filters);
  const hasFilters = filters.search || chips.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SearchInput
            id="job-order-search"
            value={search}
            onChange={setSearch}
            placeholder="ค้นหาเลขใบจัดงาน เลขแผน หรือรหัสสินค้า..."
            srLabel="ค้นหาใบจัดงาน"
            className="w-full sm:max-w-md"
          />
          <span className="hidden shrink-0 text-xs text-fg-muted sm:inline">
            พบ {totalItems.toLocaleString("th-TH")} รายการ
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            label="สถานะ"
            labelVariant="sr-only"
            value={filters.status === "all" ? "" : filters.status}
            onChange={(value) => update({ status: value || null })}
            options={STATUS_OPTIONS}
            placeholder="สถานะ"
            className="w-44"
          />
          <div className="hidden items-center gap-1.5 md:flex">
            <label htmlFor="jo-approved-from" className="sr-only">
              อนุมัติตั้งแต่
            </label>
            <input
              id="jo-approved-from"
              type="date"
              value={filters.approvedDateFrom}
              max={filters.approvedDateTo || undefined}
              onChange={(e) => update({ approvedDateFrom: e.target.value || null })}
              className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-fg"
            />
            <span className="text-xs text-fg-muted">–</span>
            <label htmlFor="jo-approved-to" className="sr-only">
              อนุมัติถึง
            </label>
            <input
              id="jo-approved-to"
              type="date"
              value={filters.approvedDateTo}
              min={filters.approvedDateFrom || undefined}
              onChange={(e) => update({ approvedDateTo: e.target.value || null })}
              className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-fg"
            />
          </div>
        </div>
      </div>
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.search && (
            <FilterChip
              label={`ค้นหา: "${filters.search}"`}
              onRemove={() => {
                setSearch("");
                update({ search: null });
              }}
            />
          )}
          {chips.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              onRemove={() =>
                chip.key === "approvedDateFrom"
                  ? update({ approvedDateFrom: null, approvedDateTo: null })
                  : update({ [chip.key]: null })
              }
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 gap-1 px-2 text-xs text-fg-muted"
          >
            <X className="size-3.5" />
            ล้างตัวกรองทั้งหมด
          </Button>
        </div>
      )}
    </div>
  );
}
