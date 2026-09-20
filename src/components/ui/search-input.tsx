"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Presentational search box (icon + accessible label) — debouncing is the
// caller's concern (each page's own 300ms setTimeout-on-change effect),
// this component only owns the controlled `value`/`onChange` display.
export function SearchInput({
  id,
  value,
  onChange,
  placeholder,
  srLabel,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  srLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
      <label htmlFor={id} className="sr-only">
        {srLabel}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
