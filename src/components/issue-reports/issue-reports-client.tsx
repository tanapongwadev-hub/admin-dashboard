"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IssueReport, PaginatedIssueReports } from "@/lib/api/issue-reports";
import {
  ISSUE_DOCUMENT_TYPES,
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_VARIANT,
  ISSUE_STATUSES,
  ISSUE_STATUS_VARIANT,
  labelOf,
  type IssueStatus,
} from "@/lib/issue-reports";
import { IssueReportCreateDialog } from "./issue-report-create-dialog";
import { IssueReportStatusDialog } from "./issue-report-status-dialog";

const FILTER_KEYS = ["search", "status", "documentType", "severity"] as const;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge variant={ISSUE_SEVERITY_VARIANT[severity] ?? "neutral"}>
      {labelOf(ISSUE_SEVERITIES, severity)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={ISSUE_STATUS_VARIANT[status as IssueStatus] ?? "neutral"} dot>
      {labelOf(ISSUE_STATUSES, status)}
    </Badge>
  );
}

function IssueNotes({ report }: { report: IssueReport }) {
  return (
    <>
      {report.description && (
        <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{report.description}</p>
      )}
      {report.resolution && (
        <p className="mt-1 text-xs text-fg-secondary">
          <span className="font-medium">แนวทางแก้ไข:</span> {report.resolution}
        </p>
      )}
    </>
  );
}

export function IssueReportsClient({
  reports,
  meta,
  summary,
  canCreate,
  canUpdate,
}: {
  reports: IssueReport[];
  meta: PaginatedIssueReports["meta"];
  summary: PaginatedIssueReports["summary"];
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = {
    search: params.get("search") ?? "",
    status: params.get("status") ?? "",
    documentType: params.get("documentType") ?? "",
    severity: params.get("severity") ?? "",
  };
  const [search, setSearch] = React.useState(current.search);
  const [createSession, setCreateSession] = React.useState<number | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<IssueReport | null>(null);

  function update(next: Partial<Record<(typeof FILTER_KEYS)[number], string | null>>) {
    const target = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, value]) =>
      value ? target.set(key, value) : target.delete(key),
    );
    target.delete("page");
    router.push(`${pathname}?${target}`);
  }

  React.useEffect(() => {
    const id = setTimeout(() => {
      if (search === current.search) return;
      const target = new URLSearchParams(params.toString());
      if (search) target.set("search", search);
      else target.delete("search");
      target.delete("page");
      router.push(`${pathname}?${target}`);
    }, 300);
    return () => clearTimeout(id);
  }, [current.search, params, pathname, router, search]);

  function clearAll() {
    setSearch("");
    const target = new URLSearchParams(params.toString());
    [...FILTER_KEYS, "page"].forEach((key) => target.delete(key));
    router.push(`${pathname}?${target}`);
  }

  function goPage(value: number) {
    const target = new URLSearchParams(params.toString());
    target.set("page", String(value));
    router.push(`${pathname}?${target}`);
  }

  const chips: Array<{ key: (typeof FILTER_KEYS)[number]; label: string }> = [];
  if (current.status)
    chips.push({ key: "status", label: `สถานะ: ${labelOf(ISSUE_STATUSES, current.status)}` });
  if (current.documentType)
    chips.push({
      key: "documentType",
      label: `เอกสาร: ${labelOf(ISSUE_DOCUMENT_TYPES, current.documentType)}`,
    });
  if (current.severity)
    chips.push({
      key: "severity",
      label: `ความรุนแรง: ${labelOf(ISSUE_SEVERITIES, current.severity)}`,
    });
  const hasFilters = !!current.search || chips.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="กรองตามสถานะ"
        className="-mb-1 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {[{ value: "", label: "ทั้งหมด" }, ...ISSUE_STATUSES].map((tab) => {
          const active = current.status === tab.value;
          const count = tab.value
            ? (summary[tab.value] ?? 0)
            : ISSUE_STATUSES.reduce((sum, item) => sum + (summary[item.value] ?? 0), 0);
          const needsAttention = tab.value === "OPEN" && count > 0 && !active;
          return (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => update({ status: tab.value || null })}
              aria-pressed={active}
              className={`-mb-px flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-fg-secondary hover:text-fg"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                  active
                    ? "bg-primary-soft text-primary"
                    : needsAttention
                      ? "bg-warning-soft text-warning-fg"
                      : "bg-surface-2 text-fg-secondary"
                }`}
              >
                {count.toLocaleString("th-TH")}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SearchInput
            id="issue-search"
            value={search}
            onChange={setSearch}
            placeholder="ค้นหาเลขแจ้งปัญหา เลขเอกสาร หรือหัวข้อ..."
            srLabel="ค้นหารายการแจ้งปัญหา"
            className="w-full sm:max-w-md"
          />
          <span className="hidden shrink-0 text-xs text-fg-muted sm:inline">
            พบ {meta.totalItems.toLocaleString("th-TH")} รายการ
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            label="ประเภทเอกสาร"
            labelVariant="sr-only"
            value={current.documentType}
            onChange={(value) => update({ documentType: value || null })}
            options={ISSUE_DOCUMENT_TYPES.map((item) => ({ ...item }))}
            placeholder="ประเภทเอกสาร"
            className="w-44"
          />
          <FilterDropdown
            label="ความรุนแรง"
            labelVariant="sr-only"
            value={current.severity}
            onChange={(value) => update({ severity: value || null })}
            options={ISSUE_SEVERITIES.map((item) => ({ ...item }))}
            placeholder="ความรุนแรง"
            className="w-40"
          />
          {canCreate && (
            <Button type="button" onClick={() => setCreateSession(Date.now())}>
              <Plus className="size-4" />
              แจ้งปัญหา
            </Button>
          )}
        </div>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {current.search && (
            <FilterChip
              label={`ค้นหา: "${current.search}"`}
              onRemove={() => {
                setSearch("");
                update({ search: null });
              }}
            />
          )}
          {chips.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              onRemove={() => update({ [chip.key]: null })}
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 gap-1 px-2 text-xs text-fg-muted"
          >
            <X className="size-3.5" />
            ล้างตัวกรองทั้งหมด
          </Button>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-fg-muted">
          {hasFilters ? "ไม่พบรายการแจ้งปัญหาตามตัวกรอง" : "ยังไม่มีรายการแจ้งปัญหา"}
        </div>
      ) : (
        <>
          {/* Tablet and up: one scannable row per report, the problem leads. */}
          <div className="hidden overflow-x-auto rounded-md border border-border bg-surface md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ปัญหา</TableHead>
                  <TableHead>เอกสาร</TableHead>
                  <TableHead>ความรุนแรง</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>ผู้แจ้ง / วันที่</TableHead>
                  {canUpdate && <TableHead className="w-28" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="max-w-sm">
                      <div className="font-mono text-xs text-fg-muted">{report.reportNo}</div>
                      <div className="font-medium text-fg">{report.title}</div>
                      <IssueNotes report={report} />
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-fg-muted">
                        {labelOf(ISSUE_DOCUMENT_TYPES, report.documentType)}
                      </div>
                      <div className="font-mono text-sm">{report.documentNo ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={report.severity} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={report.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      <div className="text-fg">
                        {report.reportedByName ?? report.reportedByUsername ?? "—"}
                      </div>
                      <div className="text-fg-muted">{formatDateTime(report.createdAt)}</div>
                    </TableCell>
                    {canUpdate && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`อัปเดตสถานะ ${report.reportNo}`}
                          onClick={() => setStatusTarget(report)}
                        >
                          <Pencil className="size-3.5" />
                          อัปเดต
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Phone: stacked cards so nothing needs horizontal scrolling. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {reports.map((report) => (
              <li
                key={report.id}
                className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-xs text-fg-muted">{report.reportNo}</span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <SeverityBadge severity={report.severity} />
                    <StatusBadge status={report.status} />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-fg">{report.title}</p>
                  <IssueNotes report={report} />
                </div>
                <p className="text-sm text-fg-secondary">
                  {labelOf(ISSUE_DOCUMENT_TYPES, report.documentType)}
                  <span className="font-mono"> {report.documentNo ?? ""}</span>
                </p>
                <div className="flex items-center justify-between gap-3 text-xs text-fg-muted">
                  <span>
                    {report.reportedByName ?? report.reportedByUsername ?? "—"} ·{" "}
                    {formatDateTime(report.createdAt)}
                  </span>
                  {canUpdate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`อัปเดตสถานะ ${report.reportNo}`}
                      onClick={() => setStatusTarget(report)}
                    >
                      <Pencil className="size-3.5" />
                      อัปเดต
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {reports.length > 0 && (
        <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            หน้า {meta.page} จาก {Math.max(1, meta.totalPages)} · ทั้งหมด{" "}
            {meta.totalItems} รายการ
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => goPage(meta.page - 1)}
            >
              <ChevronLeft className="size-4" />
              ก่อนหน้า
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => goPage(meta.page + 1)}
            >
              ถัดไป
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {createSession !== null && (
        <IssueReportCreateDialog
          key={createSession}
          open
          onOpenChange={(open) => !open && setCreateSession(null)}
          onSaved={() => {
            setCreateSession(null);
            router.refresh();
          }}
        />
      )}
      {statusTarget && (
        <IssueReportStatusDialog
          key={statusTarget.id}
          report={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onSaved={() => {
            setStatusTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
