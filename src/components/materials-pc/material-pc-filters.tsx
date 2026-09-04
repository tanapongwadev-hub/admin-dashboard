"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "active", label: "ใช้งาน" },
  { value: "inactive", label: "ไม่ใช้งาน" },
] as const;

export function MaterialPcFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");
  const status = searchParams.get("status") ?? "all";

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) {
        updateParams({ search: search || null });
      }
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหารหัสหรือชื่อ..."
          className="pl-9"
        />
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => updateParams({ status: option.value === "all" ? null : option.value })}
            className={cn(
              "px-3",
              status === option.value && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
