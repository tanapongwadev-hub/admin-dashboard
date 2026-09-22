"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { SearchInput } from "@/components/ui/search-input";
import { ProductionPlanAdvancedFilters } from "./production-plan-advanced-filters";
import {
  buildProductionPlansChips,
  PRODUCTION_PLAN_FILTER_KEYS,
  readProductionPlansFilters,
  type ProductionPlansFilterState,
} from "@/lib/filters/production-plans-filters";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "ร่าง" },
  { value: "APPROVED", label: "อนุมัติแล้ว" },
  { value: "ISSUED", label: "เบิกแล้ว" },
  { value: "CANCELLED", label: "ยกเลิก" },
  { value: "EXPIRED", label: "หมดอายุ" },
];

export function ProductionPlanFilters({ totalItems }: { totalItems: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = readProductionPlansFilters(params);
  const [search, setSearch] = React.useState(filters.search);
  function update(
    next: Partial<Record<keyof ProductionPlansFilterState, string | null>>,
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
  function apply(next: ProductionPlansFilterState) {
    const patch: Partial<
      Record<keyof ProductionPlansFilterState, string | null>
    > = {};
    PRODUCTION_PLAN_FILTER_KEYS.forEach(
      (key) =>
        (patch[key] = next[key] === "all" || !next[key] ? null : next[key]),
    );
    update(patch);
  }
  function clearAll() {
    setSearch("");
    const target = new URLSearchParams(params.toString());
    [...PRODUCTION_PLAN_FILTER_KEYS, "page"].forEach((key) =>
      target.delete(key),
    );
    router.push(`${pathname}?${target}`);
  }
  const chips = buildProductionPlansChips(filters);
  const hasFilters = filters.search || chips.length > 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SearchInput
            id="production-plan-search"
            value={search}
            onChange={setSearch}
            placeholder="ค้นหาเลขแผน ชื่อ หรือรหัสสินค้า..."
            srLabel="ค้นหาแผนการผลิต"
            className="w-full sm:max-w-md"
          />
          <span className="hidden shrink-0 text-xs text-fg-muted sm:inline">
            พบ {totalItems.toLocaleString("th-TH")} รายการ
          </span>
        </div>
        <div className="flex gap-2">
          <div className="hidden md:block">
            <FilterDropdown
              label="สถานะ"
              labelVariant="sr-only"
              value={filters.status === "all" ? "" : filters.status}
              onChange={(value) => update({ status: value || null })}
              options={STATUS_OPTIONS}
              placeholder="สถานะ"
              className="w-40"
            />
          </div>
          <ProductionPlanAdvancedFilters filters={filters} onApply={apply} />
        </div>
      </div>
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.search && (
            <FilterChip
              label={`ค้นหา: “${filters.search}”`}
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
                chip.key === "needByDateFrom"
                  ? update({ needByDateFrom: null, needByDateTo: null })
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

export { STATUS_OPTIONS };
