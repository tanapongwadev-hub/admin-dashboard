"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { FilterChip } from "@/components/ui/filter-chip";
import { MaterialsReceivingAdvancedFilters } from "@/components/materials-receiving/materials-receiving-advanced-filters";
import type { MaterialReceivingLookups } from "@/lib/api/materials-receiving";
import {
  MATERIALS_RECEIVING_ADVANCED_ONLY_KEYS,
  MATERIALS_RECEIVING_ALL_FILTER_KEYS,
  buildMaterialsReceivingChips,
  readMaterialsReceivingFilters,
  type MaterialsReceivingFilterState,
} from "@/lib/filters/materials-receiving-filters";

// Same filter architecture as /materials/pc (see AGENTS.md § Materials PC
// advanced filter redesign): one canonical state read (readMaterialsReceivingFilters),
// a quick bar whose dropdowns push to the URL immediately, a staged Advanced
// Filters drawer that commits everything in one navigation on "ใช้ตัวกรอง",
// and a removable-chip row + "ล้างตัวกรองทั้งหมด" derived from that same
// canonical state — nothing here re-derives its own slice of `searchParams`.
export function MaterialsReceivingFilters({
  lookups,
  totalItems,
}: {
  lookups: MaterialReceivingLookups;
  totalItems: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readMaterialsReceivingFilters(searchParams);
  const [search, setSearch] = React.useState(filters.search);

  function updateParams(next: Partial<Record<keyof MaterialsReceivingFilterState, string | null>>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== filters.search) updateParams({ search: search || null });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function applyAdvanced(next: MaterialsReceivingFilterState) {
    const patch: Partial<Record<keyof MaterialsReceivingFilterState, string | null>> = {};
    for (const key of MATERIALS_RECEIVING_ALL_FILTER_KEYS) {
      const value = next[key];
      patch[key] = value === "all" || !value ? null : value;
    }
    updateParams(patch);
  }

  function clearAll() {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    [...MATERIALS_RECEIVING_ALL_FILTER_KEYS, "page"].forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  // Removing the combined date-range chip clears both ends at once (see
  // lib/filters/materials-receiving-filters.ts#buildMaterialsReceivingChips)
  // — a single-key clear would leave a dangling one-sided range.
  function removeChip(key: keyof MaterialsReceivingFilterState) {
    if (key === "receiveDateFrom") {
      updateParams({ receiveDateFrom: null, receiveDateTo: null });
      return;
    }
    updateParams({ [key]: null });
  }

  const chips = buildMaterialsReceivingChips(filters, lookups);
  const advancedActiveCount = MATERIALS_RECEIVING_ADVANCED_ONLY_KEYS.filter((key) => !!filters[key]).length;
  const hasAnyFilter = chips.length > 0 || !!filters.search;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SearchInput
            id="materials-receiving-search"
            value={search}
            onChange={setSearch}
            placeholder="ค้นหา Lot หรือรหัสวัสดุ..."
            srLabel="ค้นหาด้วย Internal Lot, Supplier Lot หรือรหัสวัสดุ"
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
                { value: "draft", label: "ร่าง" },
                { value: "confirmed", label: "ยืนยันแล้ว" },
                { value: "cancelled", label: "ยกเลิก" },
              ]}
              placeholder="สถานะ"
              className="w-36"
            />
            <div className="hidden items-center gap-2 lg:flex">
              <FilterDropdown
                label="ซัพพลายเออร์"
                labelVariant="sr-only"
                value={filters.supplierId}
                onChange={(value) => updateParams({ supplierId: value || null })}
                options={lookups.suppliers.map((item) => ({ value: item.id, label: item.nameEn ?? item.nameTh ?? item.code }))}
                placeholder="ซัพพลายเออร์"
                className="w-40"
              />
            </div>
          </div>

          <MaterialsReceivingAdvancedFilters
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
