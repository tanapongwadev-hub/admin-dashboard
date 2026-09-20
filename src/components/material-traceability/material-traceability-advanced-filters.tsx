"use client";

import * as React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  MATERIAL_TRACEABILITY_FILTER_DEFAULTS,
  TRANSACTION_TYPE_LABELS,
  type MaterialTraceabilityFilterState,
} from "@/lib/filters/material-traceability-filters";

// Same staged-drawer architecture as every other filtered list in this app
// (see AGENTS.md § Materials PC advanced filter redesign / R4): every field
// is always reachable here regardless of viewport, staged locally, and
// committed in one navigation on "ใช้ตัวกรอง". "รีเซ็ต" clears this
// drawer's own fields but keeps the live quick-bar fields untouched.
export function MaterialTraceabilityAdvancedFilters({
  filters,
  advancedActiveCount,
  onApply,
}: {
  filters: MaterialTraceabilityFilterState;
  advancedActiveCount: number;
  onApply: (next: MaterialTraceabilityFilterState) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<MaterialTraceabilityFilterState>(filters);

  function handleOpenChange(next: boolean) {
    if (next) setDraft(filters);
    setOpen(next);
  }

  function set<K extends keyof MaterialTraceabilityFilterState>(key: K, value: MaterialTraceabilityFilterState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function field(key: keyof MaterialTraceabilityFilterState, label: string, placeholder?: string) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`mt-${key}`}>{label}</Label>
        <Input
          id={`mt-${key}`}
          value={draft[key]}
          placeholder={placeholder}
          onChange={(event) => set(key, event.currentTarget.value)}
        />
      </div>
    );
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
        title="ตัวกรองการสอบกลับวัสดุขั้นสูง"
        className="left-auto right-2 flex w-[24rem] flex-col data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:left-auto sm:right-3"
      >
        <div className="border-b border-border px-5 py-4 pr-12">
          <h2 className="font-semibold text-fg">ตัวกรองขั้นสูง</h2>
          <p className="mt-1 text-xs text-fg-muted">ปรับได้ทุกช่อง แล้วกด &quot;ใช้ตัวกรอง&quot; เพื่อยืนยัน</p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mt-dateFrom">Date From</Label>
              <Input
                id="mt-dateFrom"
                type="date"
                value={draft.dateFrom}
                max={draft.dateTo || undefined}
                onChange={(event) => set("dateFrom", event.currentTarget.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mt-dateTo">Date To</Label>
              <Input
                id="mt-dateTo"
                type="date"
                value={draft.dateTo}
                min={draft.dateFrom || undefined}
                onChange={(event) => set("dateTo", event.currentTarget.value)}
              />
            </div>
          </div>

          {field("materialName", "Material Name")}

          <div className="grid grid-cols-2 gap-3">
            <FilterDropdown
              label="Material Type"
              value={draft.materialType}
              onChange={(value) => set("materialType", value)}
              options={[
                { value: "PC", label: "PC" },
                { value: "OF", label: "OF" },
                { value: "OF_MAT", label: "OF-MAT" },
              ]}
            />
            <FilterDropdown
              label="Shape"
              value={draft.shape}
              onChange={(value) => set("shape", value)}
              options={[
                { value: "PCS", label: "PCS" },
                { value: "PIPE", label: "PIPE" },
                { value: "SHEET", label: "SHEET" },
                { value: "COIL", label: "COIL" },
              ]}
            />
          </div>

          {field("internalLotNo", "Internal Lot", "CCI-26J07-001")}
          {field("supplierLotNo", "Supplier Lot")}
          {field("mainQr", "MAIN QR")}
          {field("subQr", "SUB QR")}
          {field("receivingNo", "Receiving No")}
          {field("disbursementNo", "Disbursement No")}
          {field("supplierId", "Supplier ID")}
          {field("departmentId", "Department ID")}
          {field("productionOrder", "Production Order")}
          {field("referenceNo", "Reference No")}
          {field("operator", "Created By / Operator", "username")}

          <FilterDropdown
            label="Status"
            value={draft.status}
            onChange={(value) => set("status", value)}
            options={[
              { value: "draft", label: "ร่าง" },
              { value: "confirmed", label: "ยืนยันแล้ว" },
              { value: "cancelled", label: "ยกเลิก" },
            ]}
          />

          <FilterDropdown
            label="Transaction Type"
            value={draft.transactionType}
            onChange={(value) => set("transactionType", value as MaterialTraceabilityFilterState["transactionType"])}
            options={Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({ value, label: `${value} — ${label}` }))}
          />
        </div>

        <div className="flex gap-2 border-t border-border p-5">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() =>
              setDraft((prev) => ({
                ...MATERIAL_TRACEABILITY_FILTER_DEFAULTS,
                materialCode: prev.materialCode,
                transactionType: prev.transactionType,
              }))
            }
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
