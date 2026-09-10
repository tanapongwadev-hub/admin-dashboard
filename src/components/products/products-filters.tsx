"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { ProductLookups } from "@/lib/api/products";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const statusOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "active", label: "ใช้งาน" },
  { value: "inactive", label: "ไม่ใช้งาน" },
] as const;

export function ProductsFilters({ lookups }: { lookups: ProductLookups }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");
  const status = searchParams.get("status") ?? "all";
  const advancedKeys = ["modelId", "customerId", "productTypeId", "locationId", "processLineId"];
  const activeFilterCount = advancedKeys.filter((key) => searchParams.has(key)).length;

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === ALL) params.delete(key);
      else params.set(key, value);
    }
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

  function clearFilters() {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    ["search", "status", ...advancedKeys].forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  const lookupLabel = (item: ProductLookups["customers"][number]) => item.nameTh || item.nameEn || item.code;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative w-full lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
        <label htmlFor="product-search" className="sr-only">ค้นหาสินค้าด้วยรหัสหรือชื่อ</label>
        <Input
          id="product-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหารหัสหรือชื่อสินค้า..."
          className="pl-9"
        />
      </div>
      <div role="group" aria-label="กรองสถานะการใช้งาน" className="flex w-fit items-center gap-1 rounded-md border border-border bg-surface p-1">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={status === option.value}
            onClick={() => updateParams({ status: option.value === "all" ? null : option.value })}
            className={cn(
              "px-3",
              status === option.value && "bg-primary-soft text-primary hover:bg-primary-soft"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" className="w-fit">
            <Filter className="size-4" /> ตัวกรอง
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-fg">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent title="ตัวกรองสินค้า" className="left-auto right-2 w-[22rem] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:left-auto sm:right-3">
          <div className="border-b border-border px-5 py-4 pr-12">
            <h2 className="font-semibold text-fg">ตัวกรองสินค้า</h2>
            <p className="mt-1 text-xs text-fg-muted">จำกัดรายการด้วยข้อมูลแคตตาล็อกและการผลิต</p>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterSelect label="ประเภทสินค้า" value={searchParams.get("productTypeId") ?? ALL} onChange={(value) => updateParams({ productTypeId: value })} options={lookups.productTypes.map((item) => ({ value: item.id, label: lookupLabel(item) }))} />
            <FilterSelect label="ลูกค้า" value={searchParams.get("customerId") ?? ALL} onChange={(value) => updateParams({ customerId: value })} options={lookups.customers.map((item) => ({ value: item.id, label: lookupLabel(item) }))} />
            <FilterSelect label="รุ่น" value={searchParams.get("modelId") ?? ALL} onChange={(value) => updateParams({ modelId: value })} options={lookups.productModels.map((item) => ({ value: item.id, label: lookupLabel(item) }))} />
            <FilterSelect label="สถานที่" value={searchParams.get("locationId") ?? ALL} onChange={(value) => updateParams({ locationId: value })} options={lookups.locations.map((item) => ({ value: item.id, label: lookupLabel(item) }))} />
            <FilterSelect label="สายการผลิต" value={searchParams.get("processLineId") ?? ALL} onChange={(value) => updateParams({ processLineId: value })} options={lookups.processLines.map((item) => ({ value: item.id, label: lookupLabel(item) }))} />
          </div>
          <div className="flex gap-2 border-t border-border p-5">
            <Button type="button" variant="outline" className="flex-1" onClick={clearFilters}>
              <RotateCcw className="size-4" /> ล้างตัวกรอง
            </Button>
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
