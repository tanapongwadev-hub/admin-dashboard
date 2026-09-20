"use client";

import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, PackageSearch, QrCode, Scale, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { MaterialTraceabilitySummary } from "@/lib/api/material-traceability";

function formatQty(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString("th-TH", { maximumFractionDigits: 4 });
}

interface SummaryCardDef {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

// §3 of the spec: summary cards computed from the exact same filters as the
// movement table below it (both come from the same getReport() call in
// material-traceability-view.tsx — never a second, independently-filtered
// fetch) — and a real, visible STOCK MISMATCH state (§11) when any
// reconciled material's ledger sum disagrees with its live stock balance.
export function MaterialTraceabilitySummaryCards({ summary }: { summary: MaterialTraceabilitySummary }) {
  const cards: SummaryCardDef[] = [
    { label: "จำนวนรายการรับเข้า", value: summary.receivingCount.toLocaleString("th-TH"), icon: ArrowDownToLine },
    { label: "จำนวนรายการจ่ายออก", value: summary.disbursementCount.toLocaleString("th-TH"), icon: ArrowUpFromLine },
    { label: "Total Received", value: formatQty(summary.totalReceived), icon: ArrowDownToLine },
    { label: "Total Issued", value: formatQty(summary.totalIssued), icon: ArrowUpFromLine },
    { label: "Current Balance (ช่วงที่กรอง)", value: formatQty(summary.currentBalance), icon: Scale },
    { label: "จำนวน Lot", value: summary.lotCount.toLocaleString("th-TH"), icon: Tags },
    { label: "จำนวน MAIN QR", value: summary.mainQrCount.toLocaleString("th-TH"), icon: QrCode },
    { label: "จำนวน SUB QR", value: summary.subQrCount.toLocaleString("th-TH"), icon: QrCode },
    { label: "Active QR", value: summary.activeQrCount.toLocaleString("th-TH"), icon: PackageSearch },
    { label: "Exhausted QR", value: summary.exhaustedQrCount.toLocaleString("th-TH"), icon: PackageSearch },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="@container">
        <div className="grid grid-cols-2 gap-3 @min-[40rem]:grid-cols-3 @min-[64rem]:grid-cols-5">
          {cards.map((card) => (
            <Card key={card.label} className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                <card.icon className="size-3.5" />
                {card.label}
              </div>
              <p className="text-xl font-semibold tabular-nums text-fg">{card.value}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card
        className={`flex flex-wrap items-center justify-between gap-3 border p-4 ${
          summary.hasMismatch ? "border-danger/40 bg-danger-soft" : "border-success/30 bg-success-soft"
        }`}
      >
        <div className="flex items-center gap-2">
          {summary.hasMismatch ? (
            <AlertTriangle className="size-5 shrink-0 text-danger" />
          ) : (
            <CheckCircle2 className="size-5 shrink-0 text-success" />
          )}
          <div>
            <p className={`text-sm font-semibold ${summary.hasMismatch ? "text-danger" : "text-success"}`}>
              {summary.hasMismatch ? "STOCK MISMATCH — พบยอดไม่ตรงกัน" : "Stock Reconciled — ยอดตรงกันทุกวัสดุ"}
            </p>
            <p className="text-xs text-fg-muted">
              ตรวจสอบ SUM(Stock Movement) เทียบกับ Stock Balance จริง สำหรับวัสดุที่ปรากฏในผลการกรองนี้
              {summary.reconciliationTruncated && " (แสดงผลสูงสุด 25 วัสดุต่อการค้นหา)"}
            </p>
          </div>
        </div>
        {summary.reconciliation.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {summary.reconciliation
              .filter((r) => !r.isMatched)
              .slice(0, 8)
              .map((r) => (
                <Badge key={r.materialId} variant="danger">
                  {r.materialCode || r.materialId}: ledger {formatQty(r.ledgerBalance)} ≠ balance {formatQty(r.stockBalance)}
                </Badge>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
