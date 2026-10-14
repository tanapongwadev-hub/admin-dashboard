"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const SelectSearchContext = React.createContext<{
  open: boolean;
  query: string;
  setQuery: (query: string) => void;
  choose: (value: string) => void;
  close: () => void;
} | null>(null);

function useSelectSearch() {
  const context = React.useContext(SelectSearchContext);
  if (!context) throw new Error("Select components must be inside Select");
  return context;
}

function optionText(node: React.ReactNode): string {
  return React.Children.toArray(node).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) return optionText(child.props.children);
    return "";
  }).join(" ");
}

function matchesQuery(text: string, query: string) {
  const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase().trim();
  const label = normalize(text);
  return normalize(query).split(/\s+/).every((word) => label.includes(word));
}

// Keep Radix selection, form integration and dialog-safe portals. Search is
// shared here so existing Select callers automatically get Select2 behavior.
function Select({
  children, value, defaultValue = "", onValueChange,
  open: controlledOpen, defaultOpen = false, onOpenChange, ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const [query, setQuery] = React.useState("");
  const open = controlledOpen ?? internalOpen;

  function changeOpen(next: boolean) {
    setInternalOpen(next);
    setQuery("");
    onOpenChange?.(next);
  }

  function changeValue(next: string) {
    setInternalValue(next);
    onValueChange?.(next);
  }

  return (
    <SelectSearchContext.Provider value={{
      open, query: open ? query : "", setQuery,
      choose: (next) => { changeValue(next); changeOpen(false); },
      close: () => changeOpen(false),
    }}>
      <SelectPrimitive.Root {...props} value={value ?? internalValue} onValueChange={changeValue}
        open={open} onOpenChange={changeOpen}>
        {children}
      </SelectPrimitive.Root>
    </SelectSearchContext.Provider>
  );
}
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    aria-haspopup="dialog"
    className={cn(
      "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-3 py-1 text-sm text-fg transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-fg-muted" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton ref={ref} className={cn("flex items-center justify-center py-1", className)} {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton ref={ref} className={cn("flex items-center justify-center py-1", className)} {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & { searchPlaceholder?: string }
>(({ className, children, position = "popper", searchPlaceholder = "พิมพ์เพื่อค้นหา...", ...props }, ref) => {
  const { open, query, setQuery, choose, close } = useSelectSearch();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function countMatches(nodes: React.ReactNode): number {
    return React.Children.toArray(nodes).reduce<number>((count, child) => {
      if (!React.isValidElement<{ children?: React.ReactNode; textValue?: string; disabled?: boolean }>(child)) return count;
      if (child.type === SelectItem) return count + Number(matchesQuery(child.props.textValue ?? optionText(child.props.children), query));
      return count + countMatches(child.props.children);
    }, 0);
  }

  return (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      role="dialog"
      aria-label="เลือกรายการ"
      className={cn(
        "relative z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[8rem] overflow-hidden rounded-md border border-border bg-surface shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        position === "popper" && "translate-y-1",
        className
      )}
      {...props}
    >
      <div className="shrink-0 border-b border-border p-2">
        <div className="flex items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2">
          <Search className="size-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
          <input ref={inputRef} type="search" role="searchbox" autoComplete="off"
            value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder} aria-label={searchPlaceholder} aria-controls={listId}
            className="h-8 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
            onKeyDown={(event) => {
              if (event.key === "Escape") return;
              // Do not let Radix typeahead intercept typing, spaces or IME.
              event.stopPropagation();
              if (event.nativeEvent.isComposing) return;
              const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]:not([data-disabled])') ?? []);
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                (event.key === "ArrowDown" ? items[0] : items.at(-1))?.focus();
              } else if (event.key === "Enter") {
                event.preventDefault();
                const next = items[0]?.dataset.selectValue;
                if (next !== undefined) choose(next);
              } else if (event.key === "Tab") {
                close();
              }
            }} />
        </div>
      </div>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport ref={listRef} id={listId} role="listbox" aria-label="รายการที่เลือกได้"
        className={cn("min-h-0 flex-1 p-1", position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]")}>
        {children}
      </SelectPrimitive.Viewport>
      {query && countMatches(children) === 0 && <p role="status" className="px-3 py-4 text-center text-xs text-fg-muted">ไม่พบรายการที่ตรงกัน</p>}
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn("px-2 py-1.5 text-xs font-medium text-fg-muted", className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, disabled, textValue, style, ...props }, ref) => {
  const { query } = useSelectSearch();
  const matches = matchesQuery(textValue ?? optionText(children), query);
  return (
  <SelectPrimitive.Item
    ref={ref}
    disabled={disabled || !matches}
    textValue={textValue}
    data-select-value={props.value}
    style={{ ...style, ...(!matches ? { display: "none" } : {}) }}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-fg outline-none focus:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
