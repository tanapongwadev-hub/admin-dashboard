"use client";

import * as React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { MaterialLookups } from "@/lib/api/materials";
import {
  MATERIAL_PC_FILTER_DEFAULTS,
  type MaterialPcFilterState,
} from "@/lib/filters/material-pc-filters";

// The full filter set, always reachable from here regardless of viewport —
// on mobile the quick-filter dropdowns above the table are hidden entirely
// (see material-pc-filters.tsx's responsive classes), so this drawer is the
// *only* way to reach Type/Active Status/Stock Status/Location on a phone.
// Fields are staged locally (not pushed to the URL per keystroke/select) so
// "Apply Filters" commits everything in one navigation, and "Reset" can
// restore this drawer's own defaults without touching filters set outside
// it — see AGENTS.md § Materials PC advanced filter redesign.
export function MaterialPcAdvancedFilters({
  filters,
  lookups,
  canViewStock,
  advancedActiveCount,
  onApply,
}: {
  filters: MaterialPcFilterState;
  lookups: MaterialLookups;
  canViewStock: boolean;
  advancedActiveCount: number;
  onApply: (next: MaterialPcFilterState) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<MaterialPcFilterState>(filters);

  function handleOpenChange(next: boolean) {
    // Re-derive the staged copy from the live filter state every time the
    // drawer opens, so a quick-filter change made outside the drawer (e.g.
    // the Type pill on desktop) is never silently overwritten by a stale
    // draft from the last time this drawer was open.
    if (next) setDraft(filters);
    setOpen(next);
  }

  function set<K extends keyof MaterialPcFilterState>(key: K, value: MaterialPcFilterState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const lookupOptions = (items: MaterialLookups["suppliers"]) =>
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
        title="ตัวกรองวัสดุขั้นสูง"
        className="left-auto right-2 flex w-[22rem] flex-col data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:left-auto sm:right-3"
      >
        <div className="border-b border-border px-5 py-4 pr-12">
          <h2 className="font-semibold text-fg">ตัวกรองวัสดุ</h2>
          <p className="mt-1 text-xs text-fg-muted">ปรับได้ทุกช่อง แล้วกด &quot;ใช้ตัวกรอง&quot; เพื่อยืนยัน</p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterDropdown
            label="ประเภทวัสดุ"
            value={draft.type === "all" ? "" : draft.type}
            onChange={(value) => set("type", (value || "all") as MaterialPcFilterState["type"])}
            options={[
              { value: "PC", label: "PC" },
              { value: "OF", label: "OF" },
              { value: "OF_MAT", label: "OF-MAT" },
            ]}
            allLabel="ทุกประเภท"
          />

          <FilterDropdown
            label="สถานะการใช้งาน"
            value={draft.status === "all" ? "" : draft.status}
            onChange={(value) => set("status", (value || "all") as MaterialPcFilterState["status"])}
            options={[
              { value: "active", label: "ใช้งาน" },
              { value: "inactive", label: "ไม่ใช้งาน" },
            ]}
            allLabel="ทั้งหมด"
          />

          {canViewStock && (
            <FilterDropdown
              label="สถานะสต็อก"
              value={draft.stockStatus === "all" ? "" : draft.stockStatus}
              onChange={(value) => set("stockStatus", (value || "all") as MaterialPcFilterState["stockStatus"])}
              options={[
                { value: "NORMAL", label: "สต็อกปกติ" },
                { value: "LOW_STOCK", label: "สต็อกต่ำ" },
                { value: "OUT_OF_STOCK", label: "หมดสต็อก" },
              ]}
            />
          )}

          <FilterDropdown
            label="ตำแหน่ง (จุดขึ้นสินค้า)"
            value={draft.loadingPointId}
            onChange={(value) => set("loadingPointId", value)}
            options={lookupOptions(lookups.loadingPoints)}
          />

          <FilterDropdown
            label="ซัพพลายเออร์"
            value={draft.supplierId}
            onChange={(value) => set("supplierId", value)}
            options={lookupOptions(lookups.suppliers)}
          />

          <FilterDropdown
            label="รุ่น"
            value={draft.modelId}
            onChange={(value) => set("modelId", value)}
            options={lookupOptions(lookups.models)}
          />

          {canViewStock && (
            <div className="space-y-1.5">
              <Label htmlFor="process-line-filter">สายการผลิต</Label>
              <Input
                id="process-line-filter"
                value={draft.processLineName}
                placeholder="เช่น Cutting Line 1"
                onChange={(event) => set("processLineName", event.currentTarget.value)}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border p-5">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            // Resets every field this drawer controls, but keeps the live
            // search text as-is — the search box lives in the quick bar,
            // not this drawer, so "Reset" here shouldn't silently clear it
            // out from under the user.
            onClick={() => setDraft((prev) => ({ ...MATERIAL_PC_FILTER_DEFAULTS, search: prev.search }))}
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
