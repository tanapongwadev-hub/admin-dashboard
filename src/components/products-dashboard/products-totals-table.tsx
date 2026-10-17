"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, Panel, nf } from "@/components/materials-dashboard/materials-movement-overview";
import type { ProductsOverview } from "@/lib/api/products-dashboard";
import { cn } from "@/lib/utils";

type Row = ProductsOverview["byProduct"][number] & { net: number };
type SortKey = "code" | "receivedQty" | "issuedQty" | "net" | "balance" | "receivedDocs" | "issuedDocs";

function status(row: Row) {
  if (row.balance <= 0) return { label: "หมดสต็อก", variant: "danger" as const };
  if (row.balance < row.minStock) return { label: "ต่ำกว่าขั้นต่ำ", variant: "warning" as const };
  return { label: "ปกติ", variant: "success" as const };
}

// Per-product totals for the selected range: documents and quantity received /
// issued, net movement and the current balance. Search, sort and hiding of
// products without movement are client-side over the loaded list (<= 500 rows).
export function ProductsTotalsTable({ rows: source }: { rows: ProductsOverview["byProduct"] }) {
  const all = React.useMemo<Row[]>(() => source.map((r) => ({ ...r, net: r.receivedQty - r.issuedQty })), [source]);
  const [search, setSearch] = React.useState("");
  const [hideEmpty, setHideEmpty] = React.useState(true);
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "receivedQty", dir: "desc" });

  const moving = all.filter((r) => r.receivedDocs + r.issuedDocs > 0).length;
  const query = search.trim().toLowerCase();
  const rows = all
    .filter((r) => (!hideEmpty || r.receivedDocs + r.issuedDocs > 0))
    .filter((r) => !query || `${r.code} ${r.name}`.toLowerCase().includes(query))
    .sort((a, b) => {
      const av = sort.key === "code" ? a.code : a[sort.key];
      const bv = sort.key === "code" ? b.code : b[sort.key];
      const cmp = typeof av === "string" ? av.localeCompare(String(bv)) : Number(av) - Number(bv);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  const sum = (key: keyof Row) => rows.reduce((t, r) => t + Number(r[key]), 0);

  function toggle(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "code" ? "asc" : "desc" }));
  }

  function exportCsv() {
    const head = ["รหัส", "สินค้า", "หน่วย", "รับเข้า(รายการ)", "รับเข้า(ปริมาณ)", "จ่ายออก(รายการ)", "จ่ายออก(ปริมาณ)", "สุทธิ", "คงเหลือ", "ขั้นต่ำ"];
    const lines = rows.map((r) =>
      [r.code, r.name, r.unit, r.receivedDocs, r.receivedQty, r.issuedDocs, r.issuedQty, r.net, r.balance, r.minStock]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products-totals.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const SortHead = ({ k, children, right = true }: { k: SortKey; children: React.ReactNode; right?: boolean }) => {
    const active = sort.key === k;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead className={right ? "text-right" : undefined} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
        <button type="button" onClick={() => toggle(k)} className={cn("inline-flex items-center gap-1 font-semibold hover:text-fg", active ? "text-primary" : "")}>
          {children}
          <Icon className="size-3" aria-hidden="true" />
        </button>
      </TableHead>
    );
  };

  return (
    <Panel
      title="ยอดรวมรับเข้า–จ่ายออกรายสินค้า"
      hint={`${nf.format(rows.length)} จาก ${nf.format(all.length)} รายการ · ${nf.format(moving)} รายการมีความเคลื่อนไหวในช่วงนี้`}
      action={
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="size-4" aria-hidden="true" /> CSV
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
          <label htmlFor="products-totals-search" className="sr-only">ค้นหาสินค้า</label>
          <input
            id="products-totals-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารหัส / ชื่อสินค้า"
            className="h-9 w-full rounded-md border border-border-strong bg-surface pl-8 pr-2 text-sm text-fg"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-fg-secondary">
          <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="size-3.5 accent-[var(--primary)]" />
          แสดงเฉพาะสินค้าที่มีความเคลื่อนไหว
        </label>
      </div>
      {rows.length === 0 ? (
        <Empty>{all.length === 0 ? "ยังไม่มีสินค้า" : "ไม่พบสินค้าตามเงื่อนไข"}</Empty>
      ) : (
        <div className="max-h-[28rem] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead k="code" right={false}>สินค้า</SortHead>
                <SortHead k="receivedDocs">รับเข้า (รายการ)</SortHead>
                <SortHead k="receivedQty">รับเข้า (ปริมาณ)</SortHead>
                <SortHead k="issuedDocs">จ่ายออก (รายการ)</SortHead>
                <SortHead k="issuedQty">จ่ายออก (ปริมาณ)</SortHead>
                <SortHead k="net">สุทธิ</SortHead>
                <SortHead k="balance">คงเหลือ</SortHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const st = status(r);
                return (
                  <TableRow key={r.code}>
                    <TableCell className="min-w-[14rem]">
                      <span className="font-mono text-xs text-primary">{r.code}</span>
                      <span className="block text-fg-secondary">{r.name}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{nf.format(r.receivedDocs)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-success-fg">{nf.format(r.receivedQty)}</TableCell>
                    <TableCell className="text-right tabular-nums">{nf.format(r.issuedDocs)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-warning-fg">{nf.format(r.issuedQty)}</TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", r.net < 0 ? "text-danger-fg" : "text-fg")}>
                      {r.net > 0 ? "+" : ""}{nf.format(r.net)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {nf.format(r.balance)} <span className="text-xs text-fg-muted">{r.unit ?? ""}</span>
                    </TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">รวม {nf.format(rows.length)} รายการ</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{nf.format(sum("receivedDocs"))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{nf.format(sum("receivedQty"))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{nf.format(sum("issuedDocs"))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{nf.format(sum("issuedQty"))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{nf.format(sum("net"))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{nf.format(sum("balance"))}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </Panel>
  );
}
