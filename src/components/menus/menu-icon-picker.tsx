"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Circle, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MENU_ICON_ENTRIES, menuIcon } from "@/lib/menu-icons";

// Renders a resolved icon component passed in as a prop — the "resolve as
// data, pass as a prop" pattern this app uses everywhere an icon is picked
// dynamically (see AGENTS.md § Sidebar permissions). A capitalized local
// variable rendered as JSX directly in the same component that computed it
// still trips the React Compiler's "components created during render" rule
// even when memoized; passing it through a small child component's props
// sidesteps that.
function IconGlyph({ Icon, className }: { Icon: LucideIcon; className?: string }) {
  return <Icon className={className} />;
}

export function MenuIconPicker({
  id,
  value,
  onChange,
  disabled,
  ariaInvalid,
  ariaDescribedBy,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Clear the search box the moment the picker closes — done directly in the
  // open-change handler, not a reset-on-close `useEffect`, since a
  // synchronous setState inside an effect is flagged by this project's lint
  // config (see AGENTS.md § Material Receiving's "derive, don't effect" rule).
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setSearch("");
  }

  const query = search.trim().toLowerCase();
  const filtered = query
    ? MENU_ICON_ENTRIES.filter(({ name }) => name.includes(query))
    : MENU_ICON_ENTRIES;
  // Resolved via useMemo, not called inline where <SelectedIcon /> renders —
  // the latter trips the React Compiler's "components created during render"
  // rule (react-hooks/static-components), same as the sidebar/menu-tree's
  // own icon resolution (see AGENTS.md § Sidebar permissions).
  const SelectedIcon = React.useMemo(() => menuIcon(value || null), [value]);

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuPrimitive.Trigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={ariaInvalid || undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border bg-surface px-3 text-sm text-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
            ariaInvalid ? "border-danger" : "border-border-strong"
          )}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-2">
            <IconGlyph Icon={SelectedIcon} className="size-4 text-fg-secondary" />
          </span>
          <span className={cn("flex-1 truncate text-left", !value && "text-fg-muted")}>
            {value || "เลือกไอคอน"}
          </span>
          <ChevronDown className="size-4 shrink-0 text-fg-muted" />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={4}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="z-50 flex max-h-80 w-[min(22rem,90vw)] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="shrink-0 border-b border-border p-2">
            <div className="flex items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2">
              <Search className="size-3.5 shrink-0 text-fg-muted" />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  // Radix's menu Content owns arrow/typeahead handling for its
                  // Items; this input needs plain keys to reach it instead, so
                  // every key except Escape (which closes the picker, same as
                  // Radix's own default) is stopped from bubbling to Content.
                  if (event.key === "Escape") {
                    setOpen(false);
                    return;
                  }
                  event.stopPropagation();
                }}
                placeholder="ค้นหาไอคอน เช่น box, truck..."
                className="h-8 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <DropdownMenuPrimitive.Item
              onSelect={() => onChange("")}
              title="ไม่มีไอคอน"
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-md p-2 text-center outline-none hover:bg-surface-2 focus:bg-surface-2",
                !value && "bg-primary-soft text-primary"
              )}
            >
              <Circle className={cn("size-4", !value ? "text-primary" : "text-fg-muted")} />
              <span className="w-full truncate text-[10px] leading-none text-fg-muted">ไม่มี</span>
            </DropdownMenuPrimitive.Item>

            {filtered.map(({ name, Icon }) => {
              const isSelected = name === value;
              return (
                <DropdownMenuPrimitive.Item
                  key={name}
                  onSelect={() => onChange(name)}
                  title={name}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-md p-2 text-center outline-none hover:bg-surface-2 focus:bg-surface-2",
                    isSelected && "bg-primary-soft text-primary"
                  )}
                >
                  <Icon className={cn("size-4", isSelected ? "text-primary" : "text-fg-secondary")} />
                  <span className="w-full truncate text-[10px] leading-none text-fg-muted">{name}</span>
                </DropdownMenuPrimitive.Item>
              );
            })}

            {filtered.length === 0 && (
              <p className="col-span-5 py-4 text-center text-xs text-fg-muted">ไม่พบไอคอนที่ตรงกัน</p>
            )}
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
