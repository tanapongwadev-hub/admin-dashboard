"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { FilterChip } from "@/components/ui/filter-chip";
import { MaterialTraceabilityAdvancedFilters } from "@/components/material-traceability/material-traceability-advanced-filters";
import {
  MATERIAL_TRACEABILITY_ADVANCED_ONLY_KEYS,
  MATERIAL_TRACEABILITY_ALL_FILTER_KEYS,
  TRANSACTION_TYPE_LABELS,
  buildMaterialTraceabilityChips,
  readMaterialTraceabilityFilters,
  type MaterialTraceabilityFilterState,
} from "@/lib/filters/material-traceability-filters";

// Same canonical filter architecture as every other filtered table in this
// app (R4 in AGENTS.md): one canonical state read
// (readMaterialTraceabilityFilters), a quick bar whose controls push to the
// URL immediately, a staged Advanced Filters drawer that commits everything
// in one navigation, and a removable-chip row + "ล้างตัวกรองทั้งหมด" derived
// from that same canonical state.
export function MaterialTraceabilityFilters({ totalItems }: { totalItems: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readMaterialTraceabilityFilters(searchParams);
  const [materialCode, setMaterialCode] = React.useState(filters.materialCode);

  function updateParams(next: Partial<Record<keyof MaterialTraceabilityFilterState, string | null>>) {
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
      if (materialCode !== filters.materialCode) updateParams({ materialCode: materialCode || null });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialCode]);

  function applyAdvanced(next: MaterialTraceabilityFilterState) {
    const patch: Partial<Record<keyof MaterialTraceabilityFilterState, string | null>> = {};
    for (const key of MATERIAL_TRACEABILITY_ALL_FILTER_KEYS) {
      patch[key] = next[key] || null;
    }
    updateParams(patch);
  }

  function clearAll() {
    setMaterialCode("");
    const params = new URLSearchParams(searchParams.toString());
    [...MATERIAL_TRACEABILITY_ALL_FILTER_KEYS, "page"].forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  function removeChip(key: keyof MaterialTraceabilityFilterState) {
    if (key === "dateFrom") {
      updateParams({ dateFrom: null, dateTo: null });
      return;
    }
    if (key === "materialCode") setMaterialCode("");
    updateParams({ [key]: null });
  }

  const chips = buildMaterialTraceabilityChips(filters);
  const advancedActiveCount = MATERIAL_TRACEABILITY_ADVANCED_ONLY_KEYS.filter((key) => !!filters[key]).length;
  const hasAnyFilter = chips.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SearchInput
            id="material-traceability-code"
            value={materialCode}
            onChange={setMaterialCode}
            placeholder="ค้นหารหัสวัสดุ..."
            srLabel="ค้นหาด้วยรหัสวัสดุ"
            className="w-full sm:max-w-xs"
          />
          <span className="hidden shrink-0 whitespace-nowrap text-xs text-fg-muted sm:inline">
            พบ {totalItems.toLocaleString("th-TH")} รายการ
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <FilterDropdown
              label="ประเภทรายการ"
              labelVariant="sr-only"
              value={filters.transactionType}
              onChange={(value) => updateParams({ transactionType: value || null })}
              options={Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              placeholder="ประเภทรายการ"
              className="w-40"
            />
          </div>

          <MaterialTraceabilityAdvancedFilters
            filters={filters}
            advancedActiveCount={advancedActiveCount}
            onApply={applyAdvanced}
          />
        </div>
      </div>

      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2">
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
