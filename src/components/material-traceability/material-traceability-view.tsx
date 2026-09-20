"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaterialTraceabilityFilters } from "@/components/material-traceability/material-traceability-filters";
import { MaterialTraceabilitySummaryCards } from "@/components/material-traceability/material-traceability-summary";
import { MaterialTraceabilityTable } from "@/components/material-traceability/material-traceability-table";
import { MaterialTraceabilityQrSearch } from "@/components/material-traceability/material-traceability-qr-search";
import { MaterialTraceabilityExports } from "@/components/material-traceability/material-traceability-exports";
import { MaterialTraceabilityDetailsDialog, type DrillTarget } from "@/components/material-traceability/material-traceability-details";
import { filtersToParams, readMaterialTraceabilityFilters } from "@/lib/filters/material-traceability-filters";
import type { MaterialTraceabilityReport } from "@/lib/api/material-traceability";

// Orchestrator: the Server Component page (page.tsx) does the permission
// gate + initial fetch; this client component owns only UI state (which
// drill-down dialog is open, the QR search box) and renders the
// summary/table/exports from the `report` prop it's given — a filter
// change pushes to the URL, which re-renders page.tsx with fresh
// searchParams and hands this component a fresh `report`, same
// Server-Component-fetch/Server-Action-mutate pattern as every other list
// page in this app (see AGENTS.md ADR-006).
export function MaterialTraceabilityView({ report }: { report: MaterialTraceabilityReport }) {
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

      <MaterialTraceabilityFilters totalItems={report.meta.totalItems} />

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
