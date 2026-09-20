"use client";

import { Badge } from "@/components/ui/badge";
import { TRANSACTION_TYPE_LABELS } from "@/lib/filters/material-traceability-filters";
import type { MovementSummary, StockTransactionType } from "@/lib/api/material-traceability";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}

function formatQty(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString("th-TH", { maximumFractionDigits: 4 });
}

const TYPE_DOT: Record<StockTransactionType, string> = {
  RECEIVE: "bg-success",
  ISSUE: "bg-info",
  RETURN: "bg-primary",
  ADJUST_IN: "bg-warning",
  ADJUST_OUT: "bg-warning",
  TRANSFER_IN: "bg-primary",
  TRANSFER_OUT: "bg-primary",
  CANCEL: "bg-danger",
};

// §5 "Timeline / Event History": every event states Event Type, Timestamp,
// User, Reference, Qty Before, Movement Qty, Qty After, Remark — exactly
// the fields this component renders per row, connected by a vertical rail
// so the sequence reads top-to-bottom as one continuous chain of custody.
export function MaterialTraceabilityTimeline({ movements }: { movements: MovementSummary[] }) {
  if (movements.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-muted">ยังไม่มีเหตุการณ์เคลื่อนไหวสำหรับรายการนี้</p>;
  }

  return (
    <ol className="relative flex flex-col gap-0 border-l border-border pl-5">
      {movements.map((m, index) => {
        const movementNum = Number(m.movementQty);
        return (
          <li key={m.id} className="relative pb-5 last:pb-0">
            <span className={`absolute -left-[1.4rem] top-1 size-2.5 rounded-full ring-2 ring-surface ${TYPE_DOT[m.transactionType]}`} />
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{TRANSACTION_TYPE_LABELS[m.transactionType]}</Badge>
              <span className="text-xs text-fg-muted">{formatDateTime(m.transactionDate)}</span>
              <span className="font-mono text-[11px] text-fg-muted">{m.transactionNo}</span>
            </div>
            <p className="mt-1 text-sm text-fg">
              {formatQty(m.quantityBefore)} → {movementNum > 0 ? "+" : ""}
              {formatQty(m.movementQty)} → <span className="font-semibold">{formatQty(m.quantityAfter)}</span>
            </p>
            {(m.remark || m.reason) && <p className="mt-0.5 text-xs text-fg-muted">{m.remark ?? m.reason}</p>}
            {m.performedBy && <p className="mt-0.5 text-xs text-fg-muted">โดย: {m.performedBy}</p>}
            {index === movements.length - 1 && m.transactionType === "ISSUE" && Number(m.quantityAfter) === 0 && (
              <p className="mt-1 text-xs font-medium text-warning">QR STATUS CHANGED: ACTIVE → EXHAUSTED</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
