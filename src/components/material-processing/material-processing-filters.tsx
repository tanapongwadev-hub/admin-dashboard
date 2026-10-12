"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { SearchInput } from "@/components/ui/search-input";
import { buildProcessingChips, PROCESSING_STATUS_LABELS, readProcessingFilters } from "@/lib/filters/material-processing-filters";

export function MaterialProcessingFilters({ totalItems }: { totalItems: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = readProcessingFilters(params);
  const [search, setSearch] = React.useState(filters.search);
  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next}`);
  }
  React.useEffect(() => {
    if (search === filters.search) return;
    const timeout = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (search) next.set("search", search); else next.delete("search");
      next.delete("page");
      router.push(`${pathname}?${next}`);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, filters.search, params, pathname, router]);
  const chips = buildProcessingChips(filters);
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput id="processing-search" value={search} onChange={setSearch} placeholder="ค้นหารหัสรับเข้า รหัสหรือชื่อวัสดุ" srLabel="ค้นหาวัตถุดิบแปรรูป" className="w-full sm:max-w-md" />
      <FilterDropdown label="สถานะแปรรูป" labelVariant="sr-only" value={filters.status} onChange={(value) => update("status", value)} options={Object.entries(PROCESSING_STATUS_LABELS).map(([value, label]) => ({ value, label }))} className="w-48" />
      <span className="text-xs text-fg-secondary">พบ {totalItems.toLocaleString("th-TH")} รายการ</span>
    </div>
    {chips.length > 0 && <div className="flex flex-wrap items-center gap-2">{chips.map((chip) => <FilterChip key={chip.key} label={chip.label} onRemove={() => { if (chip.key === "search") setSearch(""); update(chip.key, ""); }} />)}<Button variant="ghost" size="sm" onClick={() => { setSearch(""); router.push(pathname); }}>ล้างตัวกรองทั้งหมด</Button></div>}
  </div>;
}
