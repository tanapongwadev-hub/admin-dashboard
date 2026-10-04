"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FilterDropdownOption } from "@/components/ui/filter-dropdown";

// Select box with a type-to-filter input inside the popup. Built on Radix
// DropdownMenu (same technique as menus/menu-icon-picker.tsx) so it nests
// safely inside dialogs/sheets. Same value contract as FilterDropdown:
// "" means "no filter". Options with a duplicate `value` are shown once.
export function SearchableFilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "ทั้งหมด",
  placeholder,
  searchPlaceholder = "พิมพ์เพื่อค้นหา...",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterDropdownOption[];
  allLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setSearch("");
  }

  const unique = React.useMemo(() => {
    const seen = new Set<string>();
    return options.filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }, [options]);

  const query = search.trim().toLowerCase();
  const filtered = query ? unique.filter((o) => o.label.toLowerCase().includes(query)) : unique;
  const selected = unique.find((o) => o.value === value);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="sr-only">{label}</Label>
      <DropdownMenuPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            className="flex h-9 w-full items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm text-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className={cn("flex-1 truncate text-left", !selected && "text-fg-muted")}>
              {selected ? selected.label : (placeholder ?? allLabel)}
            </span>
            <ChevronDown className="size-4 shrink-0 text-fg-muted" />
          </button>
        </DropdownMenuPrimitive.Trigger>

        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align="start"
            sideOffset={4}
            onCloseAutoFocus={(event) => event.preventDefault()}
            className="z-50 flex max-h-80 w-[min(24rem,90vw)] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
          >
            <div className="shrink-0 border-b border-border p-2">
              <div className="flex items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2">
                <Search className="size-3.5 shrink-0 text-fg-muted" />
                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    // Keep typed characters away from Radix's menu typeahead.
                    if (event.key === "Escape") {
                      setOpen(false);
                      return;
                    }
                    event.stopPropagation();
                  }}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-8 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <DropdownMenuPrimitive.Item
                onSelect={() => onChange("")}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-surface-2 focus:bg-surface-2"
              >
                <Check className={cn("size-3.5 shrink-0", value ? "opacity-0" : "text-primary")} />
                {allLabel}
              </DropdownMenuPrimitive.Item>
              {filtered.map((option) => (
                <DropdownMenuPrimitive.Item
                  key={option.value}
                  onSelect={() => onChange(option.value)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-surface-2 focus:bg-surface-2"
                >
                  <Check className={cn("size-3.5 shrink-0", option.value === value ? "text-primary" : "opacity-0")} />
                  <span className="truncate">{option.label}</span>
                </DropdownMenuPrimitive.Item>
              ))}
              {filtered.length === 0 && (
                <p className="py-4 text-center text-xs text-fg-muted">ไม่พบรายการที่ตรงกัน</p>
              )}
            </div>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );
}
