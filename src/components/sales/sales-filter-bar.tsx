"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { SearchInput } from "@/components/ui/search-input";
import type { PageMeta } from "@/lib/api/sales";
import {
  buildSalesChips,
  readSalesFilters,
  type SalesFilterState,
} from "@/lib/filters/sales-filters";

// Quick filter bar shared by the sales pages (canonical R4 shape: search +
// dropdowns that push to the URL + removable chips + clear-all + count).
// Only a handful of fields exist per page, so — like Job Orders — the date
// range lives in the bar instead of an Advanced Filters drawer.

const FILTER_KEYS: (keyof SalesFilterState)[] = [
  "search",
  "status",
  "dateFrom",
  "dateTo",
  "customerId",
  "productId",
];

export function SalesFilterBar({
  idPrefix,
  statusLabels,
  searchPlaceholder,
  dateLabel,
  totalItems,
  customers,
  products,
}: {
  idPrefix: string;
  statusLabels?: Record<string, string>;
  searchPlaceholder: string;
  dateLabel: string;
  totalItems: number;
  customers?: Array<{ id: string; code: string; nameTh: string }>;
  products?: Array<{ id: string; code: string; name: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = readSalesFilters(params, Object.keys(statusLabels ?? {}));
  const [search, setSearch] = React.useState(filters.search);

  function update(next: Partial<Record<keyof SalesFilterState, string | null>>) {
    const target = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, value]) =>
      value ? target.set(key, value) : target.delete(key),
    );
    target.delete("page");
    router.push(`${pathname}?${target}`);
  }

  React.useEffect(() => {
    const id = setTimeout(() => {
      if (search.trim() === filters.search) return;
      const target = new URLSearchParams(params.toString());
      if (search.trim()) target.set("search", search.trim());
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

  const chips = buildSalesChips(filters, { statusLabels, customers, products, dateLabel });
  const hasFilters = !!filters.search || chips.length > 0;
  const dateInput =
    "h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-fg";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SearchInput
            id={`${idPrefix}-search`}
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
            srLabel={searchPlaceholder}
            className="w-full sm:max-w-md"
          />
          <span className="hidden shrink-0 text-xs text-fg-muted sm:inline">
            พบ {totalItems.toLocaleString("th-TH")} รายการ
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusLabels && (
            <FilterDropdown
              label="สถานะ"
              labelVariant="sr-only"
              value={filters.status}
              onChange={(value) => update({ status: value || null })}
              options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
              placeholder="สถานะ"
              className="w-44"
            />
          )}
          {customers && customers.length > 0 && (
            <FilterDropdown
              label="ลูกค้า"
              labelVariant="sr-only"
              value={filters.customerId}
              onChange={(value) => update({ customerId: value || null })}
              options={customers.map((c) => ({ value: c.id, label: `${c.code} · ${c.nameTh}` }))}
              placeholder="ลูกค้า"
              className="hidden w-52 md:block"
            />
          )}
          {products && products.length > 0 && (
            <FilterDropdown
              label="สินค้า"
              labelVariant="sr-only"
              value={filters.productId}
              onChange={(value) => update({ productId: value || null })}
              options={products.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
              placeholder="สินค้า"
              className="hidden w-52 lg:block"
            />
          )}
          <div className="flex items-center gap-1.5">
            <label htmlFor={`${idPrefix}-date-from`} className="sr-only">
              {dateLabel} ตั้งแต่
            </label>
            <input
              id={`${idPrefix}-date-from`}
              type="date"
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={(e) => update({ dateFrom: e.target.value || null })}
              className={dateInput}
            />
            <span className="text-xs text-fg-muted">–</span>
            <label htmlFor={`${idPrefix}-date-to`} className="sr-only">
              {dateLabel} ถึง
            </label>
            <input
              id={`${idPrefix}-date-to`}
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => update({ dateTo: e.target.value || null })}
              className={dateInput}
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
                update(
                  Object.fromEntries(
                    [chip.key, ...(chip.alsoClear ?? [])].map((key) => [key, null]),
                  ),
                )
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

export function SalesPagination({ meta }: { meta: PageMeta }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  function go(page: number) {
    const target = new URLSearchParams(params.toString());
    target.set("page", String(page));
    router.push(`${pathname}?${target}`);
  }
  if (meta.totalItems === 0) return null;
  return (
    <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
      <p>
        หน้า {meta.page} จาก {Math.max(1, meta.totalPages)} · ทั้งหมด{" "}
        {meta.totalItems.toLocaleString("th-TH")} รายการ
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => go(meta.page - 1)}
          aria-label="หน้าก่อนหน้า"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">ก่อนหน้า</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => go(meta.page + 1)}
          aria-label="หน้าถัดไป"
        >
          <span className="hidden sm:inline">ถัดไป</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
