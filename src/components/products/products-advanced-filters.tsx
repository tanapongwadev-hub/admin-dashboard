"use client";

import * as React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { ProductLookups } from "@/lib/api/products";
import { PRODUCTS_FILTER_DEFAULTS, type ProductsFilterState } from "@/lib/filters/products-filters";

// Same architecture as /materials/pc's and /materials/materials-receiving's
// advanced drawer (see AGENTS.md § Materials PC advanced filter redesign) —
// every field always reachable here regardless of viewport, staged locally,
// committed in one navigation on "ใช้ตัวกรอง". "รีเซ็ต" clears this drawer's
// own fields but keeps the live search text (owned by the quick bar, not
// this drawer).
export function ProductsAdvancedFilters({
  filters,
  lookups,
  advancedActiveCount,
  onApply,
}: {
  filters: ProductsFilterState;
  lookups: ProductLookups;
  advancedActiveCount: number;
  onApply: (next: ProductsFilterState) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<ProductsFilterState>(filters);

  function handleOpenChange(next: boolean) {
    if (next) setDraft(filters);
    setOpen(next);
  }

  function set<K extends keyof ProductsFilterState>(key: K, value: ProductsFilterState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const lookupOptions = (items: ProductLookups["customers"]) =>
    items.map((item) => ({ value: item.id, label: item.nameEn ?? item.nameTh ?? item.code }));

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="w-fit shrink-0">
          <Filter className="size-4" /> ตัวกรองขั้นสูง
          {advancedActiveCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-fg">
              {advancedActiveCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        title="ตัวกรองสินค้าขั้นสูง"
        className="left-auto right-2 flex w-[22rem] flex-col data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:left-auto sm:right-3"
      >
        <div className="border-b border-border px-5 py-4 pr-12">
          <h2 className="font-semibold text-fg">ตัวกรองสินค้า</h2>
          <p className="mt-1 text-xs text-fg-muted">ปรับได้ทุกช่อง แล้วกด &quot;ใช้ตัวกรอง&quot; เพื่อยืนยัน</p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterDropdown
            label="ประเภทสินค้า"
            value={draft.productTypeId}
            onChange={(value) => set("productTypeId", value)}
            options={lookupOptions(lookups.productTypes)}
          />
          <FilterDropdown
            label="ลูกค้า"
            value={draft.customerId}
            onChange={(value) => set("customerId", value)}
            options={lookupOptions(lookups.customers)}
          />
          <FilterDropdown
            label="รุ่น"
            value={draft.modelId}
            onChange={(value) => set("modelId", value)}
            options={lookupOptions(lookups.productModels)}
          />
          <FilterDropdown
            label="สถานที่"
            value={draft.locationId}
            onChange={(value) => set("locationId", value)}
            options={lookupOptions(lookups.locations)}
          />
          <FilterDropdown
            label="สายการผลิต"
            value={draft.processLineId}
            onChange={(value) => set("processLineId", value)}
            options={lookupOptions(lookups.processLines)}
          />
        </div>

        <div className="flex gap-2 border-t border-border p-5">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setDraft((prev) => ({ ...PRODUCTS_FILTER_DEFAULTS, search: prev.search }))}
          >
            <RotateCcw className="size-4" /> รีเซ็ต
          </Button>
          <SheetClose asChild>
            <Button type="button" className="flex-1" onClick={() => onApply(draft)}>
              ใช้ตัวกรอง
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
