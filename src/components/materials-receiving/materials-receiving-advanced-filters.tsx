"use client";

import * as React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { MaterialReceivingLookups } from "@/lib/api/materials-receiving";
import {
  MATERIALS_RECEIVING_FILTER_DEFAULTS,
  type MaterialsReceivingFilterState,
} from "@/lib/filters/materials-receiving-filters";

// Same architecture as /materials/pc's advanced drawer (see AGENTS.md §
// Materials PC advanced filter redesign) — every field always reachable
// here regardless of viewport, staged locally, committed in one navigation
// on "ใช้ตัวกรอง". "รีเซ็ต" clears this drawer's own fields but keeps the
// live search text (owned by the quick bar, not this drawer).
export function MaterialsReceivingAdvancedFilters({
  filters,
  lookups,
  advancedActiveCount,
  onApply,
}: {
  filters: MaterialsReceivingFilterState;
  lookups: MaterialReceivingLookups;
  advancedActiveCount: number;
  onApply: (next: MaterialsReceivingFilterState) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<MaterialsReceivingFilterState>(filters);

  function handleOpenChange(next: boolean) {
    if (next) setDraft(filters);
    setOpen(next);
  }

  function set<K extends keyof MaterialsReceivingFilterState>(key: K, value: MaterialsReceivingFilterState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

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
        title="ตัวกรองการรับเข้าวัตถุดิบขั้นสูง"
        className="left-auto right-2 flex w-[22rem] flex-col data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:left-auto sm:right-3"
      >
        <div className="border-b border-border px-5 py-4 pr-12">
          <h2 className="font-semibold text-fg">ตัวกรองการรับเข้าวัตถุดิบ</h2>
          <p className="mt-1 text-xs text-fg-muted">ปรับได้ทุกช่อง แล้วกด &quot;ใช้ตัวกรอง&quot; เพื่อยืนยัน</p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterDropdown
            label="สถานะ"
            value={draft.status === "all" ? "" : draft.status}
            onChange={(value) => set("status", (value || "all") as MaterialsReceivingFilterState["status"])}
            options={[
              { value: "draft", label: "ร่าง" },
              { value: "confirmed", label: "ยืนยันแล้ว" },
              { value: "cancelled", label: "ยกเลิก" },
            ]}
          />

          <FilterDropdown
            label="วัสดุ"
            value={draft.materialId}
            onChange={(value) => set("materialId", value)}
            options={lookups.materials.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))}
          />

          <FilterDropdown
            label="ซัพพลายเออร์"
            value={draft.supplierId}
            onChange={(value) => set("supplierId", value)}
            options={lookups.suppliers.map((item) => ({ value: item.id, label: item.nameEn ?? item.nameTh ?? item.code }))}
          />

          <div className="space-y-1.5">
            <Label htmlFor="receiving-date-from">วันที่รับเข้า — ตั้งแต่</Label>
            <Input
              id="receiving-date-from"
              type="date"
              value={draft.receiveDateFrom}
              max={draft.receiveDateTo || undefined}
              onChange={(event) => set("receiveDateFrom", event.currentTarget.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receiving-date-to">วันที่รับเข้า — ถึง</Label>
            <Input
              id="receiving-date-to"
              type="date"
              value={draft.receiveDateTo}
              min={draft.receiveDateFrom || undefined}
              onChange={(event) => set("receiveDateTo", event.currentTarget.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-border p-5">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setDraft((prev) => ({ ...MATERIALS_RECEIVING_FILTER_DEFAULTS, search: prev.search }))}
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
