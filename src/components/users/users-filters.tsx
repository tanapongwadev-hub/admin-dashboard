"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { SearchInput } from "@/components/ui/search-input";
import {
  USER_STATUS_OPTIONS,
  buildUsersChips,
  readUsersFilters,
  type UsersFilterState,
} from "@/lib/filters/users-filters";

const FILTER_KEYS: (keyof UsersFilterState)[] = ["search", "status"];

// Only search + status exist on GET /users, so no Advanced Filters drawer
// (same small-filter exception as the job-order list).
export function UsersFilters({ totalItems }: { totalItems: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = readUsersFilters(params);
  const [search, setSearch] = React.useState(filters.search);

  function update(next: Partial<Record<keyof UsersFilterState, string | null>>) {
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

  const chips = buildUsersChips(filters);
  const hasFilters = Boolean(filters.search) || chips.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SearchInput
            id="user-search"
            value={search}
            onChange={setSearch}
            placeholder="ค้นหาชื่อผู้ใช้ ชื่อ นามสกุล หรืออีเมล..."
            srLabel="ค้นหาผู้ใช้"
            className="w-full sm:max-w-md"
          />
          <span className="hidden shrink-0 text-xs text-fg-muted sm:inline">
            พบ {totalItems.toLocaleString("th-TH")} รายการ
          </span>
        </div>
        <FilterDropdown
          label="สถานะ"
          labelVariant="sr-only"
          value={filters.status === "all" ? "" : filters.status}
          onChange={(value) => update({ status: value || null })}
          options={USER_STATUS_OPTIONS}
          placeholder="สถานะ"
          className="w-full sm:w-44"
        />
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
            <FilterChip key={chip.key} label={chip.label} onRemove={() => update({ [chip.key]: null })} />
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
