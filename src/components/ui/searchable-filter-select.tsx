"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FilterDropdownOption } from "@/components/ui/filter-dropdown";

// Compatibility wrapper: all callers share the searchable Select.
// Empty filter values remain an adapter detail, never exposed to callers.
export function SearchableFilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel = "ทั้งหมด",
  placeholder,
  searchPlaceholder = "พิมพ์เพื่อค้นหา...",
  className,
  disabled,
  invalid,
  onBlur,
  triggerRef,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterDropdownOption[];
  allLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  triggerRef?: React.Ref<HTMLButtonElement>;
}) {
  const unique = React.useMemo(() => {
    const seen = new Set<string>();
    return options.filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }, [options]);

  const emptyValue = React.useMemo(() => {
    let candidate = "__empty_filter__";
    while (unique.some((option) => option.value === candidate)) candidate += "_";
    return candidate;
  }, [unique]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="sr-only">{label}</Label>
      <Select disabled={disabled} value={value || emptyValue}
        onValueChange={(next) => onChange(next === emptyValue ? "" : next)}>
        <SelectTrigger id={id} ref={triggerRef} onBlur={onBlur}
          aria-invalid={invalid || undefined} aria-label={label}>
          <SelectValue placeholder={placeholder ?? allLabel}>
            {value ? undefined : (placeholder ?? allLabel)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent searchPlaceholder={searchPlaceholder}>
          <SelectItem value={emptyValue}>{allLabel}</SelectItem>
          {unique.filter((option) => option.value !== "").map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
