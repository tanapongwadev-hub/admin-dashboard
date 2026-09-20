"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TRANSACTION_TYPE_LABELS } from "@/lib/filters/material-traceability-filters";
import type { MaterialTraceabilityMovement, StockTransactionType } from "@/lib/api/material-traceability";

const TYPE_BADGE_VARIANT: Record<StockTransactionType, "primary" | "danger" | "warning" | "info" | "success" | "neutral"> = {
  RECEIVE: "success",
  ISSUE: "info",
  RETURN: "primary",
  ADJUST_IN: "warning",
  ADJUST_OUT: "warning",
  TRANSFER_IN: "primary",
  TRANSFER_OUT: "primary",
  CANCEL: "danger",
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatQty(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString("th-TH", { maximumFractionDigits: 4 });
}

// §4 Main Transaction Report — the dense, paginated stock-movement table,
// backed one-to-one by cps-api's `stock_transactions` ledger (the source of
// truth, per §8 of the spec). §14 Drill-down: every code (material, lot,
// MAIN/SUB QR, receiving/disbursement no) is clickable.
export function MaterialTraceabilityTable({
  items,
  onOpenMainQr,
  onOpenSubQr,
  onOpenReceiving,
  onOpenDisbursement,
}: {
  items: MaterialTraceabilityMovement[];
  onOpenMainQr: (id: string) => void;
  onOpenSubQr: (id: string) => void;
  onOpenReceiving: (id: string) => void;
  onOpenDisbursement: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-fg">ไม่พบรายการเคลื่อนไหวตามเงื่อนไขที่เลือก</p>
        <p className="text-xs text-fg-muted">ลองปรับหรือล้างตัวกรองแล้วค้นหาใหม่อีกครั้ง</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader className="bg-surface">
          <TableRow>
            <TableHead>วันที่/เวลา</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>วัสดุ</TableHead>
            <TableHead>Internal Lot / Supplier Lot</TableHead>
            <TableHead>MAIN QR</TableHead>
            <TableHead>SUB QR</TableHead>
            <TableHead className="text-right">ก่อน</TableHead>
            <TableHead className="text-right">เคลื่อนไหว</TableHead>
            <TableHead className="text-right">หลัง</TableHead>
            <TableHead>เอกสาร</TableHead>
            <TableHead>ผู้ปฏิบัติงาน</TableHead>
            <TableHead>หมายเหตุ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => {
            const movementNum = Number(row.movementQty);
            return (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-xs text-fg-secondary">{formatDateTime(row.transactionDate)}</TableCell>
                <TableCell>
                  <Badge variant={TYPE_BADGE_VARIANT[row.transactionType]}>{TRANSACTION_TYPE_LABELS[row.transactionType]}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="font-medium text-fg">{row.material.code}</div>
                  <div className="text-xs text-fg-muted">{row.material.name}</div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  <div className="font-mono text-fg-secondary">{row.internalLotNo ?? "—"}</div>
                  <div className="text-fg-muted">{row.supplierLotNo ?? ""}</div>
                </TableCell>
                <TableCell>
                  {row.mainQr ? (
                    <button
                      type="button"
                      className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                      onClick={() => onOpenMainQr(row.mainQr!.id)}
                    >
                      {row.mainQr.code ?? row.mainQr.id}
                    </button>
                  ) : (
                    <span className="text-xs text-fg-muted">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {row.subQr ? (
                    <button
                      type="button"
                      className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                      onClick={() => onOpenSubQr(row.subQr!.id)}
                    >
                      {row.subQr.code ?? row.subQr.id}
                      {row.subQr.boxNo != null && <span className="text-fg-muted"> · #{row.subQr.boxNo}</span>}
                    </button>
                  ) : (
                    <span className="text-xs text-fg-muted">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs text-fg-secondary">{formatQty(row.quantityBefore)}</TableCell>
                <TableCell
                  className={`text-right tabular-nums text-xs font-semibold ${
                    movementNum > 0 ? "text-success" : movementNum < 0 ? "text-danger" : "text-fg-muted"
                  }`}
                >
                  {movementNum > 0 ? "+" : ""}
                  {formatQty(row.movementQty)} {row.unit ?? ""}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs font-medium text-fg">{formatQty(row.quantityAfter)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {row.receiving && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => onOpenReceiving(row.receiving!.id)}
                    >
                      รับเข้า {row.receiving.no}
                    </Button>
                  )}
                  {row.disbursement && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => onOpenDisbursement(row.disbursement!.id)}
                    >
                      จ่ายออก {row.disbursement.no}
                    </Button>
                  )}
                  {!row.receiving && !row.disbursement && <span className="text-fg-muted">—</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-fg-secondary">{row.performedBy?.username ?? "—"}</TableCell>
                <TableCell className="max-w-48 truncate text-xs text-fg-muted" title={row.remark ?? row.reason ?? undefined}>
                  {row.remark ?? row.reason ?? ""}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
