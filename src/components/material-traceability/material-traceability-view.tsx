"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, List as ListIcon, PackageMinus, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaterialTraceabilityFilters } from "@/components/material-traceability/material-traceability-filters";
import { MaterialTraceabilitySummaryCards } from "@/components/material-traceability/material-traceability-summary";
import { MaterialTraceabilityTable } from "@/components/material-traceability/material-traceability-table";
import { MaterialTraceabilityQrSearch } from "@/components/material-traceability/material-traceability-qr-search";
import { MaterialTraceabilityExports } from "@/components/material-traceability/material-traceability-exports";
import { MaterialTraceabilityDetailsDialog, type DrillTarget } from "@/components/material-traceability/material-traceability-details";
import { filtersToParams, readMaterialTraceabilityFilters } from "@/lib/filters/material-traceability-filters";
import { MaterialTraceabilityLotFlow } from "@/components/material-traceability/material-traceability-lot-flow";
import type { LotFlow, MaterialTraceabilityReport } from "@/lib/api/material-traceability";

// Orchestrator: the Server Component page (page.tsx) does the permission
// gate + initial fetch; this client component owns only UI state (which
// drill-down dialog is open, the QR search box) and renders the
// summary/table/exports from the `report` prop it's given — a filter
// change pushes to the URL, which re-renders page.tsx with fresh
// searchParams and hands this component a fresh `report`, same
// Server-Component-fetch/Server-Action-mutate pattern as every other list
// page in this app (see AGENTS.md ADR-006).
// First, last, and a window of 1 page around the current one; "gap" marks a
// skipped run so the control stays compact on large result sets.
function pageNumbers(current: number, total: number): Array<number | "gap"> {
  const last = Math.max(1, total);
  const keep = new Set([1, last, current - 1, current, current + 1]);
  const sorted = [...keep].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) result.push("gap");
    result.push(n);
  });
  return result;
}

export function MaterialTraceabilityView({
  report,
  materialOptions,
  lotFlow,
}: {
  lotFlow: LotFlow | null;
  report: MaterialTraceabilityReport;
  materialOptions: FilterDropdownOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readMaterialTraceabilityFilters(searchParams);
  const [drillTarget, setDrillTarget] = React.useState<DrillTarget | null>(null);

  const page = report.meta.page;
  const totalPages = report.meta.totalPages;
  const limit = report.meta.limit;

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  // Receiving / disbursement tabs are the same `transactionType` URL filter the
  // quick-bar dropdown and chips use, so the three controls always agree.
  function setTransactionType(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("transactionType", value);
    else params.delete("transactionType");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  // Same page-size selector shape as material-pc-table.tsx (see AGENTS.md §
  // Materials PC) — capped at 200, matching cps-api's own
  // QueryMaterialTraceabilityDto Max(200) limit.
  function changePageSize(nextLimit: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", nextLimit);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full max-w-sm">
          <MaterialTraceabilityQrSearch onFound={setDrillTarget} />
        </div>
        <MaterialTraceabilityExports params={filtersToParams(filters)} />
      </div>

      <MaterialTraceabilitySummaryCards summary={report.summary} />

      <MaterialTraceabilityFilters totalItems={report.meta.totalItems} materialOptions={materialOptions} />

      {lotFlow && filters.materialCode && (
        <MaterialTraceabilityLotFlow
          materialCode={filters.materialCode}
          flow={lotFlow}
          onOpenReceiving={(id) => setDrillTarget({ type: "receiving", id })}
          onOpenDisbursement={(id) => setDrillTarget({ type: "disbursement", id })}
        />
      )}

      <div
        role="group"
        aria-label="มุมมองรายการ"
        className="inline-flex w-fit items-center gap-1 rounded-lg border border-border bg-surface-2 p-1"
      >
        {(
          [
            { value: "", label: "รายการทั้งหมด", icon: ListIcon, count: null },
            { value: "RECEIVE", label: "รายการรับเข้า", icon: PackagePlus, count: report.summary.receivingCount },
            { value: "ISSUE", label: "รายการจ่ายออก", icon: PackageMinus, count: report.summary.disbursementCount },
          ] as const
        ).map((tab) => {
          const active = filters.transactionType === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={active}
              onClick={() => setTransactionType(tab.value)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                active ? "bg-surface font-semibold text-primary shadow-sm" : "text-fg-secondary hover:text-fg"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
              {tab.count !== null && (
                <span className="rounded-full bg-surface-2 px-1.5 text-[11px] tabular-nums text-fg-muted">
                  {tab.count.toLocaleString("th-TH")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <MaterialTraceabilityTable
        items={report.items}
        onOpenMainQr={(id) => setDrillTarget({ type: "main-qr", id })}
        onOpenSubQr={(id) => setDrillTarget({ type: "sub-qr", id })}
        onOpenReceiving={(id) => setDrillTarget({ type: "receiving", id })}
        onOpenDisbursement={(id) => setDrillTarget({ type: "disbursement", id })}
      />

      <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          หน้า {page} จาก {Math.max(1, totalPages)} · ทั้งหมด {report.meta.totalItems.toLocaleString("th-TH")} รายการ
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
            <span className="whitespace-nowrap text-xs">แสดงต่อหน้า</span>
            <Select value={String(limit)} onValueChange={changePageSize}>
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100, 200].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="หน้าก่อนหน้า"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">ก่อนหน้า</span>
          </Button>
          <div className="hidden items-center gap-1 sm:flex">
            {pageNumbers(page, totalPages).map((item, index) =>
              item === "gap" ? (
                <span key={`gap-${index}`} className="px-1 text-fg-muted" aria-hidden>
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === page ? "primary" : "outline"}
                  size="sm"
                  className="min-w-8 px-2"
                  aria-label={`ไปหน้า ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  onClick={() => item !== page && goToPage(item)}
                >
                  {item}
                </Button>
              ),
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="หน้าถัดไป"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            <span className="hidden sm:inline">ถัดไป</span> <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <MaterialTraceabilityDetailsDialog target={drillTarget} onOpenChange={setDrillTarget} />
    </div>
  );
}
