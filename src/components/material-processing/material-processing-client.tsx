"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { History, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { MaterialReceiving, MaterialReceivingLookups } from "@/lib/api/materials-receiving";
import type { ProcessingList, ProcessingSource } from "@/lib/api/material-processing";
import { PROCESSING_STATUS_LABELS } from "@/lib/filters/material-processing-filters";
import { processingOutputAction } from "@/app/(dashboard)/material-processing/actions";
import { MaterialProcessingFilters } from "./material-processing-filters";
import { MaterialProcessingFormDialog } from "./material-processing-form-dialog";
import { MaterialProcessingHistoryDialog } from "./material-processing-history-dialog";
import { MaterialsReceivingDetailsDialog } from "@/components/materials-receiving/materials-receiving-details-dialog";
import { MaterialsReceivingQrPrintSheet } from "@/components/materials-receiving/materials-receiving-qr-print-sheet";
import { formatNumber } from "@/lib/utils";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export function getMaterialProcessingRowActions(
  row: ProcessingSource,
  canProcess: boolean,
  handlers: { onProcess: (source: ProcessingSource) => void; onHistory: (source: ProcessingSource) => void },
): RowAction[] {
  const actions: RowAction[] = [];
  if (canProcess && row.canProcessUnits && Number(row.availableQuantity) >= 1 && row.processingStatus !== "PROCESSED") {
    actions.push({ label: "แปรรูป", icon: Scissors, onSelect: () => handlers.onProcess(row) });
  }
  actions.push({ label: "ประวัติแปรรูป", icon: History, onSelect: () => handlers.onHistory(row) });
  return actions;
}

export function MaterialProcessingClient({ list, lookups, canProcess }: { list: ProcessingList; lookups: MaterialReceivingLookups; canProcess: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [source, setSource] = React.useState<ProcessingSource | null>(null);
  const [formSession, setFormSession] = React.useState(0);
  const [history, setHistory] = React.useState<ProcessingSource | null>(null);
  const [output, setOutput] = React.useState<MaterialReceiving | null>(null);
  const [printTarget, setPrintTarget] = React.useState<MaterialReceiving | null>(null);
  const [loadingOutput, setLoadingOutput] = React.useState(false);
  const printDone = React.useCallback(() => setPrintTarget(null), []);
  function openProcess(row: ProcessingSource) { setFormSession((value) => value + 1); setSource(row); }
  function goToPage(page: number) { const next = new URLSearchParams(params.toString()); next.set("page", String(page)); router.push(`${pathname}?${next}`); }
  async function openOutput(id: string) {
    if (loadingOutput) return;
    setLoadingOutput(true);
    try {
      const result = await processingOutputAction(id);
      if (result.status === "error") { toast.error(result.message); return; }
      setHistory(null);
      setOutput(result.receiving);
    } catch { toast.error(CONNECTION_ERROR_MESSAGE); }
    finally { setLoadingOutput(false); }
  }
  return <>
    <MaterialProcessingFilters key={`${params.get("search") ?? ""}:${params.get("status") ?? ""}`} totalItems={list.meta.totalItems} />
    <div className="overflow-hidden rounded-xl border border-border bg-surface"><Table><TableHeader><TableRow><TableHead>ล็อตรับเข้า / วัตถุดิบ</TableHead><TableHead>รูปทรง</TableHead><TableHead className="text-right">รับเข้า</TableHead><TableHead className="text-right">แปรรูปแล้ว</TableHead><TableHead className="text-right">พร้อมแปรรูป</TableHead><TableHead>สถานะ</TableHead><TableHead className="w-12"><span className="sr-only">การจัดการ</span></TableHead></TableRow></TableHeader><TableBody>
      {list.items.length === 0 ? <TableRow><TableCell colSpan={7} className="py-14 text-center text-fg-secondary">ไม่พบรายการรับเข้า PIPE / SHEET / COIL ที่ยืนยันแล้วตามตัวกรอง</TableCell></TableRow> : list.items.map((row) => {
        return <TableRow key={row.id}><TableCell><Link href={`/materials/receiving?search=${encodeURIComponent(row.internalLotNo)}`} className="font-mono text-xs font-semibold text-primary hover:underline">{row.internalLotNo}</Link><p className="mt-1 text-sm font-medium text-fg">{row.materialCode} · {row.materialName}</p><p className="mt-1 text-xs text-fg-secondary">{new Date(row.receiveDate).toLocaleDateString("th-TH")}</p>{!row.canProcessUnits && <p className="mt-1 text-xs text-warning-fg">ล็อตเดิมแปลงหน่วยแล้ว ต้องกระทบยอดก่อนแปรรูป</p>}</TableCell><TableCell><Badge>{row.materialType}</Badge></TableCell><TableCell className="text-right tabular-nums">{formatNumber(Number(row.receiveQuantity))} {row.unit}</TableCell><TableCell className="text-right tabular-nums">{formatNumber(Number(row.processedQuantity))}</TableCell><TableCell className="text-right"><p className="font-semibold tabular-nums text-primary">{formatNumber(Number(row.availableQuantity))}</p><p className="text-xs text-fg-secondary">คงเหลือ {formatNumber(Number(row.remainingQuantity))}</p></TableCell><TableCell><Badge variant={row.processingStatus === "PROCESSED" ? "success" : row.processingStatus === "PARTIAL" ? "info" : "warning"}>{PROCESSING_STATUS_LABELS[row.processingStatus]}</Badge></TableCell><TableCell><RowActionsMenu itemLabel={row.internalLotNo} actions={getMaterialProcessingRowActions(row, canProcess, { onProcess: openProcess, onHistory: setHistory })} /></TableCell></TableRow>;
      })}
    </TableBody></Table></div>
    <div className="flex items-center justify-between gap-3"><p className="text-sm text-fg-secondary">หน้า {list.meta.page} / {list.meta.totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={list.meta.page <= 1} onClick={() => goToPage(list.meta.page - 1)}>ก่อนหน้า</Button><Button variant="outline" size="sm" disabled={list.meta.page >= list.meta.totalPages} onClick={() => goToPage(list.meta.page + 1)}>ถัดไป</Button></div></div>
    {source && <MaterialProcessingFormDialog key={`${source.id}:${formSession}`} source={source} lookups={lookups} onClose={() => setSource(null)} onSaved={() => { setSource(null); router.refresh(); }} />}
    {history && <MaterialProcessingHistoryDialog key={history.id} source={history} onClose={() => setHistory(null)} onOutput={openOutput} />}
    <MaterialsReceivingDetailsDialog receiving={output} onOpenChange={(open) => { if (!open) setOutput(null); }} onPrint={setPrintTarget} />
    <MaterialsReceivingQrPrintSheet receiving={printTarget} onDone={printDone} />
  </>;
}
