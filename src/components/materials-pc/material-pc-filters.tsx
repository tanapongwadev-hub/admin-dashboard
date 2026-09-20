"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { FilterChip } from "@/components/ui/filter-chip";
import { MaterialPcAdvancedFilters } from "@/components/materials-pc/material-pc-advanced-filters";
import type { MaterialLookups } from "@/lib/api/materials";
import {
  MATERIAL_PC_ADVANCED_ONLY_KEYS,
  MATERIAL_PC_ALL_FILTER_KEYS,
  buildMaterialPcChips,
  readMaterialPcFilters,
  type MaterialPcFilterState,
} from "@/lib/filters/material-pc-filters";

// Redesigned filter bar for /materials/pc — see AGENTS.md § Materials PC
// advanced filter redesign for the full writeup. Architecture:
//   1. `readMaterialPcFilters(searchParams)` is the ONE place the current
//      URL is parsed into a typed, canonical MaterialPcFilterState — every
//      piece below (quick dropdowns, chips, the drawer) reads from that same
//      object, never from `searchParams` directly, so there's no risk of two
//      controls disagreeing about what "the current filters" are.
//   2. Quick filters (Type/Location/Stock Status/Active Status) push to the
//      URL immediately on change, same as before this redesign.
//   3. The Advanced Filters drawer stages its own copy and only commits via
//      "Apply Filters" (one navigation for every field at once) — see
//      material-pc-advanced-filters.tsx.
//   4. Active filter chips + "Clear all" derive from the same canonical
//      state/lookups, so a chip's remove button is always "clear that one
//      key" (updateParams({ [key]: null })), nothing bespoke per chip.
export function MaterialPcFilters({
  lookups,
  canViewStock,
  totalItems,
}: {
  lookups: MaterialLookups;
  canViewStock: boolean;
  totalItems: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readMaterialPcFilters(searchParams);
  const [search, setSearch] = React.useState(filters.search);

  function updateParams(next: Partial<Record<keyof MaterialPcFilterState, string | null>>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounced search — same 300ms pattern this page already used, kept
  // as-is, only moved behind the canonical-state read above.
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== filters.search) updateParams({ search: search || null });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function applyAdvanced(next: MaterialPcFilterState) {
    const patch: Partial<Record<keyof MaterialPcFilterState, string | null>> = {};
    for (const key of MATERIAL_PC_ALL_FILTER_KEYS) {
      const value = next[key];
      patch[key] = value === "all" || !value ? null : value;
    }
    updateParams(patch);
  }

  function clearAll() {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    [...MATERIAL_PC_ALL_FILTER_KEYS, "page"].forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  const chips = buildMaterialPcChips(filters, lookups);
  const advancedActiveCount = MATERIAL_PC_ADVANCED_ONLY_KEYS.filter((key) => !!filters[key]).length;
  const hasAnyFilter = chips.length > 0 || !!filters.search;

  const lookupOptions = (items: MaterialLookups["suppliers"]) =>
    items.map((item) => ({ value: item.id, label: item.nameEn ?? item.nameTh ?? item.code }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SearchInput
            id="material-search"
            value={search}
            onChange={setSearch}
            placeholder="ค้นหารหัสหรือชื่อวัสดุ..."
            srLabel="ค้นหาวัสดุด้วยรหัสหรือชื่อ"
            className="w-full sm:max-w-sm"
          />
          <span className="hidden shrink-0 whitespace-nowrap text-xs text-fg-muted sm:inline">
            พบ {totalItems.toLocaleString("th-TH")} รายการ
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick filters — hidden below md (mobile shows search + the
              Advanced Filters button only), and Location/Stock Status drop
              further at md (tablet keeps just Type + Active Status quick,
              the rest live in the drawer). Every field here is reachable
              from the drawer too, regardless of viewport. */}
          <div className="hidden items-center gap-2 md:flex">
            <FilterDropdown
              label="ประเภทวัสดุ"
              labelVariant="sr-only"
              value={filters.type === "all" ? "" : filters.type}
              onChange={(value) => updateParams({ type: value || null })}
              options={[
                { value: "PC", label: "PC" },
                { value: "OF", label: "OF" },
                { value: "OF_MAT", label: "OF-MAT" },
              ]}
              allLabel="ทุกประเภท"
              placeholder="ประเภทวัสดุ"
              className="w-32"
            />
            <FilterDropdown
              label="สถานะการใช้งาน"
              labelVariant="sr-only"
              value={filters.status === "all" ? "" : filters.status}
              onChange={(value) => updateParams({ status: value || null })}
              options={[
                { value: "active", label: "ใช้งาน" },
                { value: "inactive", label: "ไม่ใช้งาน" },
              ]}
              placeholder="สถานะการใช้งาน"
              className="w-36"
            />
            <div className="hidden items-center gap-2 lg:flex">
              <FilterDropdown
                label="ตำแหน่ง"
                labelVariant="sr-only"
                value={filters.loadingPointId}
                onChange={(value) => updateParams({ loadingPointId: value || null })}
                options={lookupOptions(lookups.loadingPoints)}
                placeholder="ตำแหน่ง"
                className="w-36"
              />
              {canViewStock && (
                <FilterDropdown
                  label="สถานะสต็อก"
                  labelVariant="sr-only"
                  value={filters.stockStatus === "all" ? "" : filters.stockStatus}
                  onChange={(value) => updateParams({ stockStatus: value || null })}
                  options={[
                    { value: "NORMAL", label: "สต็อกปกติ" },
                    { value: "LOW_STOCK", label: "สต็อกต่ำ" },
                    { value: "OUT_OF_STOCK", label: "หมดสต็อก" },
                  ]}
                  placeholder="สถานะสต็อก"
                  className="w-36"
                />
              )}
            </div>
          </div>

          <MaterialPcAdvancedFilters
            filters={filters}
            lookups={lookups}
            canViewStock={canViewStock}
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
            <FilterChip key={chip.key} label={chip.label} onRemove={() => updateParams({ [chip.key]: null })} />
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="h-7 gap-1 px-2 text-xs text-fg-muted">
            <X className="size-3.5" /> ล้างตัวกรองทั้งหมด
          </Button>
        </div>
      )}
    </div>
  );
}
