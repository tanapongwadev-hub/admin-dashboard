"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { MaterialLookups } from "@/lib/api/materials";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const statusOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "active", label: "ใช้งาน" },
  { value: "inactive", label: "ไม่ใช้งาน" },
] as const;

export function MaterialPcFilters({ lookups, canViewStock }: { lookups: MaterialLookups; canViewStock: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");
  const status = searchParams.get("status") ?? "all";
  const advancedKeys = ["stockStatus", "supplierId", "modelId", "loadingPointId", "processLineName"];
  const activeFilterCount = advancedKeys.filter((key) => searchParams.has(key)).length;

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === ALL) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) updateParams({ search: search || null });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function clearFilters() {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    ["search", "status", ...advancedKeys, "page"].forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  const lookupLabel = (item: MaterialLookups["suppliers"][number]) => item.nameEn ?? item.nameTh ?? item.code;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative w-full lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
        <label htmlFor="material-search" className="sr-only">ค้นหาวัสดุด้วยรหัสหรือชื่อ</label>
        <Input id="material-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหารหัสหรือชื่อวัสดุ..." className="pl-9" />
      </div>

      <div role="group" aria-label="กรองสถานะการใช้งาน" className="flex w-fit items-center gap-1 rounded-md border border-border bg-surface p-1">
        {statusOptions.map((option) => (
          <Button key={option.value} type="button" size="sm" variant="ghost" aria-pressed={status === option.value} onClick={() => updateParams({ status: option.value === "all" ? null : option.value })} className={cn("px-3", status === option.value && "bg-primary-soft text-primary hover:bg-primary-soft")}>
            {option.label}
          </Button>
        ))}
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" className="w-fit">
            <Filter className="size-4" /> ตัวกรอง
            {activeFilterCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-fg">{activeFilterCount}</span>}
          </Button>
        </SheetTrigger>
        <SheetContent title="ตัวกรองวัสดุ PC" className="left-auto right-2 w-[22rem] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:left-auto sm:right-3">
          <div className="border-b border-border px-5 py-4 pr-12">
            <h2 className="font-semibold text-fg">ตัวกรองวัสดุ</h2>
            <p className="mt-1 text-xs text-fg-muted">จำกัดรายการด้วยข้อมูลคลังและการผลิต</p>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {canViewStock && <FilterSelect label="สถานะสต็อก" value={searchParams.get("stockStatus") ?? ALL} onChange={(value) => updateParams({ stockStatus: value })} options={[{ value: "NORMAL", label: "สต็อกปกติ" }, { value: "LOW_STOCK", label: "สต็อกต่ำ" }, { value: "OUT_OF_STOCK", label: "หมดสต็อก" }]} />}
            <FilterSelect label="ซัพพลายเออร์" value={searchParams.get("supplierId") ?? ALL} onChange={(value) => updateParams({ supplierId: value })} options={lookups.suppliers.map((item) => ({ value: item.id, label: lookupLabel(item) }))} />
            <FilterSelect label="รุ่น" value={searchParams.get("modelId") ?? ALL} onChange={(value) => updateParams({ modelId: value })} options={lookups.models.map((item) => ({ value: item.id, label: lookupLabel(item) }))} />
            <FilterSelect label="จุดขึ้นสินค้า" value={searchParams.get("loadingPointId") ?? ALL} onChange={(value) => updateParams({ loadingPointId: value })} options={lookups.loadingPoints.map((item) => ({ value: item.id, label: lookupLabel(item) }))} />
            {canViewStock && (
              <div className="space-y-1.5">
                <Label htmlFor="process-line-filter">สายการผลิต</Label>
                <Input id="process-line-filter" defaultValue={searchParams.get("processLineName") ?? ""} placeholder="เช่น Cutting Line 1" onBlur={(event) => updateParams({ processLineName: event.currentTarget.value.trim() || null })} onKeyDown={(event) => { if (event.key === "Enter") updateParams({ processLineName: event.currentTarget.value.trim() || null }); }} />
              </div>
            )}
          </div>
          <div className="flex gap-2 border-t border-border p-5">
            <Button type="button" variant="outline" className="flex-1" onClick={clearFilters}><RotateCcw className="size-4" /> ล้างตัวกรอง</Button>
            <SheetClose asChild><Button type="button" className="flex-1">เสร็จสิ้น</Button></SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>ทั้งหมด</SelectItem>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
