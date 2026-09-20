"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { FilterChip } from "@/components/ui/filter-chip";
import { ProductsAdvancedFilters } from "@/components/products/products-advanced-filters";
import type { ProductLookups } from "@/lib/api/products";
import {
  PRODUCTS_ADVANCED_ONLY_KEYS,
  PRODUCTS_ALL_FILTER_KEYS,
  buildProductsChips,
  readProductsFilters,
  type ProductsFilterState,
} from "@/lib/filters/products-filters";

// Same filter architecture as /materials/pc and /materials/materials-receiving
// (see AGENTS.md § Materials PC advanced filter redesign, and R4's rule that
// every data table with filters follows this shape): one canonical state read
// (readProductsFilters), a quick bar whose dropdowns push to the URL
// immediately, a staged Advanced Filters drawer that commits everything in
// one navigation on "ใช้ตัวกรอง", and a removable-chip row +
// "ล้างตัวกรองทั้งหมด" derived from that same canonical state — nothing here
// re-derives its own slice of `searchParams`.
export function ProductsFilters({ lookups, totalItems }: { lookups: ProductLookups; totalItems: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readProductsFilters(searchParams);
  const [search, setSearch] = React.useState(filters.search);

  function updateParams(next: Partial<Record<keyof ProductsFilterState, string | null>>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== filters.search) updateParams({ search: search || null });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function applyAdvanced(next: ProductsFilterState) {
    const patch: Partial<Record<keyof ProductsFilterState, string | null>> = {};
    for (const key of PRODUCTS_ALL_FILTER_KEYS) {
      const value = next[key];
      patch[key] = value === "all" || !value ? null : value;
    }
    updateParams(patch);
  }

  function clearAll() {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    PRODUCTS_ALL_FILTER_KEYS.forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  function removeChip(key: keyof ProductsFilterState) {
    updateParams({ [key]: null });
  }

  const chips = buildProductsChips(filters, lookups);
  const advancedActiveCount = PRODUCTS_ADVANCED_ONLY_KEYS.filter((key) => !!filters[key]).length;
  const hasAnyFilter = chips.length > 0 || !!filters.search;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SearchInput
            id="product-search"
            value={search}
            onChange={setSearch}
            placeholder="ค้นหารหัสหรือชื่อสินค้า..."
            srLabel="ค้นหาสินค้าด้วยรหัสหรือชื่อ"
            className="w-full sm:max-w-sm"
          />
          <span className="hidden shrink-0 whitespace-nowrap text-xs text-fg-muted sm:inline">
            พบ {totalItems.toLocaleString("th-TH")} รายการ
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick filters — hidden below md (mobile: search + Advanced
              Filters button only). Every field here is also reachable from
              the drawer, so nothing is viewport-exclusive. */}
          <div className="hidden items-center gap-2 md:flex">
            <FilterDropdown
              label="สถานะ"
              labelVariant="sr-only"
              value={filters.status === "all" ? "" : filters.status}
              onChange={(value) => updateParams({ status: value || null })}
              options={[
                { value: "active", label: "ใช้งาน" },
                { value: "inactive", label: "ไม่ใช้งาน" },
              ]}
              placeholder="สถานะ"
              className="w-36"
            />
            <div className="hidden items-center gap-2 lg:flex">
              <FilterDropdown
                label="ประเภทสินค้า"
                labelVariant="sr-only"
                value={filters.productTypeId}
                onChange={(value) => updateParams({ productTypeId: value || null })}
                options={lookups.productTypes.map((item) => ({ value: item.id, label: item.nameEn ?? item.nameTh ?? item.code }))}
                placeholder="ประเภทสินค้า"
                className="w-40"
              />
            </div>
          </div>

          <ProductsAdvancedFilters
            filters={filters}
            lookups={lookups}
            advancedActiveCount={advancedActiveCount}
            onApply={applyAdvanced}
          />
        </div>
      </div>

      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.search && (
            <FilterChip
              label={`ค้นหา: "${filters.search}"`}
              onRemove={() => {
                setSearch("");
                updateParams({ search: null });
              }}
            />
          )}
          {chips.map((chip) => (
            <FilterChip key={chip.key} label={chip.label} onRemove={() => removeChip(chip.key)} />
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="h-7 gap-1 px-2 text-xs text-fg-muted">
            <X className="size-3.5" /> ล้างตัวกรองทั้งหมด
          </Button>
        </div>
      )}
    </div>
  );
}
