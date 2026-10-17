"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductLotReport, ProductLotRow } from "@/lib/api/production-lots";
import { formatThaiDate } from "@/lib/production-day";

interface Filters {
  search: string;
  dateFrom: string;
  dateTo: string;
  soldStatus: string;
}

const STATUS_LABEL: Record<string, string> = { UNSOLD: "ยังไม่ขาย", PARTIAL: "ขายบางส่วน", SOLD: "ขายครบ" };
const fmt = (n: number) => n.toLocaleString("th-TH");

function rowStatus(row: ProductLotRow): "UNSOLD" | "PARTIAL" | "SOLD" | null {
  if (row.soldQty === null) return null;
  if (row.soldQty <= 0) return "UNSOLD";
  return row.soldQty >= row.packedQty ? "SOLD" : "PARTIAL";
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-fg">{value}</p>
    </div>
  );
}

export function ProductLotReportView({
  report,
  filters,
  limit,
  pageSizes,
}: {
  report: ProductLotReport;
  filters: Filters;
  limit: number;
  pageSizes: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();
  const [search, setSearch] = useState(filters.search);

  function push(changes: Record<string, string>) {
    const next = new URLSearchParams(current.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in changes)) next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  useEffect(() => {
    if (search === filters.search) return;
    const t = setTimeout(() => push({ search }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { summary, meta, items, access } = report;
  const chips: Array<{ key: string; label: string; clear: Record<string, string> }> = [];
  if (filters.search) chips.push({ key: "search", label: `ค้นหา: ${filters.search}`, clear: { search: "" } });
  if (filters.soldStatus) chips.push({ key: "sold", label: `สถานะ: ${STATUS_LABEL[filters.soldStatus]}`, clear: { soldStatus: "" } });
  if (filters.dateFrom || filters.dateTo)
    chips.push({
      key: "date",
      label: `วันที่ผลิต: ${filters.dateFrom || "…"} – ${filters.dateTo || "…"}`,
      clear: { dateFrom: "", dateTo: "" },
    });

  function exportCsv() {
    const header = ["Lot", "สินค้า", "ชื่อสินค้า", "ใบสั่งผลิต", "วันที่ผลิต", "กะ", "แพ็ก", "กล่อง", "ขายแล้ว", "ขายครั้งแรก", "ขายล่าสุด"];
    const lines = items.map((r) =>
      [r.lotNo, r.productCode, r.productName, r.orderCode, r.productionDate, r.shift, r.packedQty, r.boxCount, r.soldQty, r.firstSaleDate, r.lastSaleDate]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "product-lots.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="จำนวน Lot" value={fmt(summary.lots)} />
        <Kpi label="กล่องที่แพ็ก" value={fmt(summary.boxes)} />
        <Kpi label="จำนวนที่แพ็ก (ชิ้น)" value={fmt(summary.packedQty)} />
        <Kpi label="ขายแล้ว (ชิ้น)" value={summary.soldQty === null ? "—" : fmt(summary.soldQty)} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput id="product-lot-search" srLabel="ค้นหา Lot สินค้า" placeholder="ค้นหา Lot / สินค้า / ใบสั่งผลิต" value={search} onChange={setSearch} className="w-full sm:w-72" />
        {access.sales && (
          <FilterDropdown
            label="สถานะการขาย"
            labelVariant="sr-only"
            value={filters.soldStatus}
            onChange={(v) => push({ soldStatus: v })}
            options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
            allLabel="ทุกสถานะการขาย"
            className="w-44"
          />
        )}
        <label className="flex items-center gap-1.5 text-xs text-fg-muted">
          ผลิตตั้งแต่
          <input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(e) => push({ dateFrom: e.target.value })} className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-fg" />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-fg-muted">
          ถึง
          <input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(e) => push({ dateTo: e.target.value })} className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-fg" />
        </label>
        <span className="ml-auto text-sm text-fg-muted">พบ {fmt(meta.totalItems)} รายการ</span>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={items.length === 0}>
          <Download className="size-4" /> CSV
        </Button>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <FilterChip key={c.key} label={c.label} onRemove={() => push(c.clear)} />
          ))}
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => push({ search: "", soldStatus: "", dateFrom: "", dateTo: "" })}>
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-16 text-center">
          <PackageSearch className="size-8 text-fg-muted" />
          <p className="font-medium text-fg">ไม่พบ Lot สินค้า</p>
          <p className="max-w-sm text-sm text-fg-muted">Lot จะปรากฏเมื่อมีการแพ็กกล่อง FG จากใบสั่งผลิตแบบ Lot แล้ว</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot FG</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead>ใบสั่งผลิต</TableHead>
                <TableHead>ผลิตวันที่</TableHead>
                <TableHead className="text-right">แพ็ก (กล่อง)</TableHead>
                <TableHead className="text-right">ขายแล้ว</TableHead>
                <TableHead>ขายวันที่</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => {
                const status = rowStatus(r);
                return (
                  <TableRow key={r.lotId}>
                    <TableCell>
                      <Link href={`/reports/production?q=${encodeURIComponent(r.lotNo)}`} className="font-mono text-xs text-primary hover:underline">
                        {r.lotNo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-primary">{r.productCode}</span>
                      <span className="block text-fg-secondary">{r.productName}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.orderCode}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatThaiDate(r.productionDate)}
                      {r.shift && <span className="ml-1 text-xs text-fg-muted">กะ {r.shift}</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(r.packedQty)} <span className="text-xs text-fg-muted">({r.boxCount})</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.soldQty === null ? "—" : fmt(r.soldQty)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.firstSaleDate ? (
                        <>
                          {formatThaiDate(r.firstSaleDate)}
                          {r.lastSaleDate && r.lastSaleDate !== r.firstSaleDate && <span className="block text-fg-muted">ถึง {formatThaiDate(r.lastSaleDate)}</span>}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {status ? (
                        <Badge variant={status === "SOLD" ? "success" : status === "PARTIAL" ? "warning" : "neutral"}>{STATUS_LABEL[status]}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
        <span>
          หน้า {meta.page} จาก {meta.totalPages} · ทั้งหมด {fmt(meta.totalItems)} รายการ
        </span>
        <div className="flex items-center gap-2">
          <Select value={String(limit)} onValueChange={(v) => push({ limit: v })}>
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} / หน้า
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => push({ page: String(meta.page - 1) })}>
            ก่อนหน้า
          </Button>
          <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => push({ page: String(meta.page + 1) })}>
            ถัดไป
          </Button>
        </div>
      </div>
    </>
  );
}
