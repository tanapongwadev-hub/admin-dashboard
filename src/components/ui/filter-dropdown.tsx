"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterDropdownOption {
  value: string;
  label: string;
}

// Sentinel for "no filter" in a Radix Select, which can't represent an
// empty-string item value — translated back to "" at the callback boundary
// so callers never see this internal detail.
const ALL_VALUE = "__all__";

// Generic labeled single-select filter control — a compact quick-filter
// dropdown (labelVariant="sr-only") or a full labeled field inside a filter
// drawer (labelVariant="visible", the default). Reuse this for any list
// page's filter dropdowns instead of hand-rolling a Select + Label pair.
export function FilterDropdown({
  label,
  value,
  onChange,
  options,
  allLabel = "ทั้งหมด",
  placeholder,
  labelVariant = "visible",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterDropdownOption[];
  allLabel?: string;
  placeholder?: string;
  labelVariant?: "visible" | "sr-only";
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className={labelVariant === "sr-only" ? "sr-only" : undefined}>{label}</Label>
      <Select value={value || ALL_VALUE} onValueChange={(next) => onChange(next === ALL_VALUE ? "" : next)}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder ?? label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
