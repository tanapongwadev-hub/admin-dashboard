"use client";

import * as React from "react";
import { Download, FileSpreadsheet, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAllMovementsForExportAction } from "@/app/(dashboard)/materials/materials-report/actions";
import { TRANSACTION_TYPE_LABELS } from "@/lib/filters/material-traceability-filters";
import type { ListMaterialTraceabilityParams, MaterialTraceabilityMovement, MaterialTraceabilitySummary } from "@/lib/api/material-traceability";

function download(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const MOVEMENT_COLUMNS: Array<[string, (row: MaterialTraceabilityMovement) => string | number | null]> = [
  ["Date/Time", (r) => r.transactionDate],
  ["Transaction No", (r) => r.transactionNo],
  ["Transaction Type", (r) => TRANSACTION_TYPE_LABELS[r.transactionType]],
  ["Reference No", (r) => r.referenceNo],
  ["Receiving No", (r) => r.receiving?.no ?? null],
  ["Disbursement No", (r) => r.disbursement?.no ?? null],
  ["Material Code", (r) => r.material.code],
  ["Material Name", (r) => r.material.name],
  ["Internal Lot", (r) => r.internalLotNo],
  ["Supplier Lot", (r) => r.supplierLotNo],
  ["MAIN QR", (r) => r.mainQr?.code ?? null],
  ["SUB QR", (r) => r.subQr?.code ?? null],
  ["Box No", (r) => r.subQr?.boxNo ?? null],
  ["Qty Before", (r) => r.quantityBefore],
  ["Movement Qty", (r) => r.movementQty],
  ["Qty After", (r) => r.quantityAfter],
  ["Unit", (r) => r.unit],
  ["Supplier", (r) => r.supplier?.nameEn ?? r.supplier?.nameTh ?? null],
  ["Department", (r) => r.department?.nameTh ?? null],
  ["Production Order", (r) => r.productionOrder],
  ["Performed By", (r) => r.performedBy?.username ?? null],
  ["Created At", (r) => r.createdAt],
  ["Remark", (r) => r.remark],
];

function buildCsv(items: MaterialTraceabilityMovement[]): string {
  const header = MOVEMENT_COLUMNS.map(([label]) => csvEscape(label)).join(",");
  const rows = items.map((row) => MOVEMENT_COLUMNS.map(([, getter]) => csvEscape(getter(row))).join(","));
  // Leading UTF-8 BOM so Excel opens Thai text correctly, same convention
  // as the dashboard-home CSV export (see AGENTS.md § Dashboard home).
  return `﻿${[header, ...rows].join("\r\n")}`;
}

function xmlEscape(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function xmlRow(cells: Array<string | number | null | undefined>): string {
  return `<Row>${cells
    .map((c) => `<Cell><Data ss:Type="String">${xmlEscape(c)}</Data></Cell>`)
    .join("")}</Row>`;
}

function xmlWorksheet(name: string, header: string[], rows: Array<Array<string | number | null | undefined>>): string {
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${xmlRow(header)}${rows.map(xmlRow).join("")}</Table></Worksheet>`;
}

// §15: Excel export via SpreadsheetML (a plain XML dialect Excel opens
// natively) — no xlsx dependency needed, per the handoff's own suggested
// dependency-free approach. Sheets: Summary, Stock Movement, Receiving,
// Disbursement, QR Traceability — the minimum set the spec asks for.
function buildExcelXml(summary: MaterialTraceabilitySummary, items: MaterialTraceabilityMovement[]): string {
  const summarySheet = xmlWorksheet(
    "Summary",
    ["Metric", "Value"],
    [
      ["จำนวนรายการรับเข้า", summary.receivingCount],
      ["จำนวนรายการจ่ายออก", summary.disbursementCount],
      ["Total Received", summary.totalReceived],
      ["Total Issued", summary.totalIssued],
      ["Current Balance", summary.currentBalance],
      ["จำนวน Lot", summary.lotCount],
      ["จำนวน MAIN QR", summary.mainQrCount],
      ["จำนวน SUB QR", summary.subQrCount],
      ["Active QR", summary.activeQrCount],
      ["Exhausted QR", summary.exhaustedQrCount],
      ["STOCK MISMATCH", summary.hasMismatch ? "YES" : "NO"],
    ]
  );

  const movementHeader = MOVEMENT_COLUMNS.map(([label]) => label);
  const movementRows = items.map((row) => MOVEMENT_COLUMNS.map(([, getter]) => getter(row)));
  const movementSheet = xmlWorksheet("Stock Movement", movementHeader, movementRows);

  const receivingRows = items.filter((r) => r.transactionType === "RECEIVE");
  const receivingSheet = xmlWorksheet("Receiving", movementHeader, receivingRows.map((row) => MOVEMENT_COLUMNS.map(([, getter]) => getter(row))));

  const disbursementRows = items.filter((r) => r.transactionType === "ISSUE");
  const disbursementSheet = xmlWorksheet(
    "Disbursement",
    movementHeader,
    disbursementRows.map((row) => MOVEMENT_COLUMNS.map(([, getter]) => getter(row)))
  );

  const qrRows = items.filter((r) => r.mainQr || r.subQr);
  const qrSheet = xmlWorksheet(
    "QR Traceability",
    ["MAIN QR", "SUB QR", "Box No", "Material", "Internal Lot", "Status", "Current Qty After"],
    qrRows.map((r) => [
      r.mainQr?.code ?? "",
      r.subQr?.code ?? "",
      r.subQr?.boxNo ?? "",
      `${r.material.code} · ${r.material.name}`,
      r.internalLotNo ?? "",
      r.subQr?.status ?? "",
      r.quantityAfter,
    ])
  );

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${summarySheet}${movementSheet}${receivingSheet}${disbursementSheet}${qrSheet}
</Workbook>`;
}

// Renders into the CURRENT document (hidden on screen, shown only under
// `@media print`) rather than a new `window.open()` tab — per this
// project's own established rule (see admin-dashboard AGENTS.md's 2026-09-19
// "QR print" entry): `window.open()` + `document.write()` is popup-blocker-
// fragile and can silently fail depending on how recently the triggering
// click counts as a user gesture. `globals.css` already hides the rest of
// the app shell (`#dashboard-shell`) under `@media print`, so this node just
// needs to be marked visible-only-when-printing.
function buildPrintContent(summary: MaterialTraceabilitySummary, items: MaterialTraceabilityMovement[]): string {
  const rows = items
    .map(
      (r) => `<tr>
        <td>${new Date(r.transactionDate).toLocaleString("th-TH")}</td>
        <td>${TRANSACTION_TYPE_LABELS[r.transactionType]}</td>
        <td>${r.material.code}</td>
        <td>${r.internalLotNo ?? ""}</td>
        <td>${r.mainQr?.code ?? ""}</td>
        <td>${r.subQr?.code ?? ""}</td>
        <td style="text-align:right">${r.quantityBefore}</td>
        <td style="text-align:right">${r.movementQty}</td>
        <td style="text-align:right">${r.quantityAfter}</td>
      </tr>`
    )
    .join("");

  return `<div style="font-family: 'IBM Plex Sans Thai', Tahoma, sans-serif; padding: 24px; color: #172033;">
  <h1 style="font-size: 18px; margin-bottom: 4px;">Material Receiving &amp; Disbursement Traceability Report</h1>
  <p>Generated: ${new Date().toLocaleString("th-TH")}</p>
  ${summary.hasMismatch ? '<p style="color:#DC2626;font-weight:600;">⚠ STOCK MISMATCH DETECTED</p>' : ""}
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0;font-size:12px;">
    <div style="border:1px solid #E2E8F0;padding:6px 8px;border-radius:6px;">รับเข้า: ${summary.receivingCount}</div>
    <div style="border:1px solid #E2E8F0;padding:6px 8px;border-radius:6px;">จ่ายออก: ${summary.disbursementCount}</div>
    <div style="border:1px solid #E2E8F0;padding:6px 8px;border-radius:6px;">Total Received: ${summary.totalReceived}</div>
    <div style="border:1px solid #E2E8F0;padding:6px 8px;border-radius:6px;">Total Issued: ${summary.totalIssued}</div>
    <div style="border:1px solid #E2E8F0;padding:6px 8px;border-radius:6px;">Lot: ${summary.lotCount}</div>
    <div style="border:1px solid #E2E8F0;padding:6px 8px;border-radius:6px;">MAIN QR: ${summary.mainQrCount}</div>
    <div style="border:1px solid #E2E8F0;padding:6px 8px;border-radius:6px;">SUB QR: ${summary.subQrCount}</div>
    <div style="border:1px solid #E2E8F0;padding:6px 8px;border-radius:6px;">Active/Exhausted: ${summary.activeQrCount}/${summary.exhaustedQrCount}</div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <thead><tr>
      <th style="border:1px solid #E2E8F0;padding:4px 6px;background:#F5F7FA;text-align:left;">Date/Time</th>
      <th style="border:1px solid #E2E8F0;padding:4px 6px;background:#F5F7FA;text-align:left;">Type</th>
      <th style="border:1px solid #E2E8F0;padding:4px 6px;background:#F5F7FA;text-align:left;">Material</th>
      <th style="border:1px solid #E2E8F0;padding:4px 6px;background:#F5F7FA;text-align:left;">Internal Lot</th>
      <th style="border:1px solid #E2E8F0;padding:4px 6px;background:#F5F7FA;text-align:left;">MAIN QR</th>
      <th style="border:1px solid #E2E8F0;padding:4px 6px;background:#F5F7FA;text-align:left;">SUB QR</th>
      <th style="border:1px solid #E2E8F0;padding:4px 6px;background:#F5F7FA;text-align:left;">Before</th>
      <th style="border:1px solid #E2E8F0;padding:4px 6px;background:#F5F7FA;text-align:left;">Movement</th>
      <th style="border:1px solid #E2E8F0;padding:4px 6px;background:#F5F7FA;text-align:left;">After</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

function printReport(summary: MaterialTraceabilitySummary, items: MaterialTraceabilityMovement[]) {
  const existing = document.getElementById("mt-print-root");
  if (existing) existing.remove();
  const root = document.createElement("div");
  root.id = "mt-print-root";
  root.className = "hidden print:block";
  root.innerHTML = buildPrintContent(summary, items);
  document.body.appendChild(root);

  const cleanup = () => {
    root.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  requestAnimationFrame(() => window.print());
}

// §15 Export — CSV (Blob), Excel (SpreadsheetML XML, no xlsx dependency),
// and PDF (a print-specific HTML document opened in a new tab + the
// browser's own print-to-PDF, per the handoff's suggested dependency-free
// approach). All three re-fetch through fetchAllMovementsForExportAction
// using the exact same filter query the screen is showing (§15 "Export
// ต้องอ้างอิง Filter เดียวกับหน้าจอ") — never a second, independently-built
// query.
export function MaterialTraceabilityExports({ params }: { params: ListMaterialTraceabilityParams }) {
  const [pending, setPending] = React.useState<"csv" | "excel" | "pdf" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function withData(fn: (summary: MaterialTraceabilitySummary, items: MaterialTraceabilityMovement[]) => void, kind: "csv" | "excel" | "pdf") {
    setPending(kind);
    setError(null);
    const { page: _page, limit: _limit, ...rest } = params;
    void _page;
    void _limit;
    const result = await fetchAllMovementsForExportAction(rest);
    setPending(null);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    fn(result.data.summary, result.data.items);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() => withData((_s, items) => download(`material-traceability-${Date.now()}.csv`, buildCsv(items), "text/csv;charset=utf-8"), "csv")}
        >
          {pending === "csv" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() =>
            withData(
              (summary, items) => download(`material-traceability-${Date.now()}.xls`, buildExcelXml(summary, items), "application/vnd.ms-excel"),
              "excel"
            )
          }
        >
          {pending === "excel" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} Excel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() => withData((summary, items) => printReport(summary, items), "pdf")}
        >
          {pending === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />} PDF
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
