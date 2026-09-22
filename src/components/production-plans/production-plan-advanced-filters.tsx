"use client";

import * as React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ProductionPlansFilterState } from "@/lib/filters/production-plans-filters";
const STATUS_OPTIONS = [
  { value: "DRAFT", label: "ร่าง" },
  { value: "APPROVED", label: "อนุมัติแล้ว" },
  { value: "ISSUED", label: "เบิกแล้ว" },
  { value: "CANCELLED", label: "ยกเลิก" },
  { value: "EXPIRED", label: "หมดอายุ" },
];

export function ProductionPlanAdvancedFilters({
  filters,
  onApply,
}: {
  filters: ProductionPlansFilterState;
  onApply: (next: ProductionPlansFilterState) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(filters);
  const count =
    Number(!!filters.needByDateFrom) + Number(!!filters.needByDateTo);
  function set<K extends keyof ProductionPlansFilterState>(
    key: K,
    value: ProductionPlansFilterState[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(filters);
        setOpen(next);
      }}
    >
      <SheetTrigger asChild>
        <Button type="button" variant="outline">
          <Filter className="size-4" />
          ตัวกรองขั้นสูง
          {count > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-fg">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        title="ตัวกรองแผนการผลิต"
        className="left-auto right-2 flex w-[22rem] flex-col data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:left-auto sm:right-3"
      >
        <div className="border-b border-border px-5 py-4 pr-12">
          <h2 className="font-semibold text-fg">ตัวกรองแผนการผลิต</h2>
          <p className="mt-1 text-xs text-fg-muted">
            กำหนดเงื่อนไขแล้วกดใช้ตัวกรอง
          </p>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <FilterDropdown
            label="สถานะ"
            value={draft.status === "all" ? "" : draft.status}
            onChange={(value) =>
              set(
                "status",
                (value || "all") as ProductionPlansFilterState["status"],
              )
            }
            options={STATUS_OPTIONS}
          />
          <div className="space-y-1.5">
            <Label htmlFor="plan-need-from">วันที่ต้องการใช้ — ตั้งแต่</Label>
            <Input
              id="plan-need-from"
              type="date"
              value={draft.needByDateFrom}
              max={draft.needByDateTo || undefined}
              onChange={(event) =>
                set("needByDateFrom", event.currentTarget.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-need-to">วันที่ต้องการใช้ — ถึง</Label>
            <Input
              id="plan-need-to"
              type="date"
              value={draft.needByDateTo}
              min={draft.needByDateFrom || undefined}
              onChange={(event) =>
                set("needByDateTo", event.currentTarget.value)
              }
            />
          </div>
        </div>
        <div className="flex gap-2 border-t border-border p-5">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() =>
              setDraft((current) => ({
                search: current.search,
                status: "all",
                needByDateFrom: "",
                needByDateTo: "",
              }))
            }
          >
            <RotateCcw className="size-4" />
            รีเซ็ต
          </Button>
          <SheetClose asChild>
            <Button
              type="button"
              className="flex-1"
              onClick={() => onApply(draft)}
            >
              ใช้ตัวกรอง
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
