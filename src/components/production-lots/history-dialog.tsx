"use client";

import { History, Loader2, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getLineHistoryAction } from "@/app/(dashboard)/products/process-orders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HistoryEntry } from "@/lib/api/production-lots";
import { formatThaiDate } from "@/lib/production-day";
import type { ReverseTarget } from "./reverse-dialog";

const KIND_LABEL: Record<HistoryEntry["kind"], string> = {
  PRODUCE: "บันทึกผลิต",
  RECEIVE: "รับเข้า",
  TRANSFER: "ส่งต่อ",
  CLOSE: "ปิดยอดค้าง",
  PACK: "แพ็กกล่อง",
};

/** Postgres text timestamptz ("2026-10-06 08:03:12+07") → HH:mm; "+07" needs ":00" to parse. */
function timeOf(value: string): string {
  const iso = value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function summary(e: HistoryEntry): string {
  const parts: string[] = [];
  if (e.kind === "TRANSFER") parts.push(`${e.transferredQty} ชิ้น`);
  if (e.kind === "PACK") parts.push(`${e.boxCount} กล่อง ${e.packedQty} ชิ้น`);
  if (e.goodQty) parts.push(`ดี ${e.goodQty} ชิ้น`);
  if (e.rejectQty) parts.push(`เสีย ${e.rejectQty} ชิ้น`);
  if (e.closedQty) parts.push(`ปิด ${e.closedQty} ชิ้น`);
  return parts.join(" · ");
}

/**
 * Every produce/receive/transfer/close request of one order line, newest
 * first. A reversible one has "กลับรายการ", which hands over to the normal
 * ReverseDialog; the server still re-checks (per origin) when it runs.
 * The parent remounts this per open, so it always loads fresh history.
 */
export function HistoryDialog({
  lineId,
  canAct,
  orderCompleted = false,
  onClose,
  onReverse,
}: {
  lineId: string;
  canAct: boolean;
  /** A completed order only lets packing be voided (it reopens the order). */
  orderCompleted?: boolean;
  onClose: () => void;
  onReverse: (target: ReverseTarget) => void;
}) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getLineHistoryAction(lineId).then((r) => {
      if (!alive) return;
      if (r.status === "success") setEntries(r.history);
      else setError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [lineId]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5" aria-hidden /> ประวัติการบันทึก
          </DialogTitle>
          <DialogDescription>
            ทุกครั้งที่บันทึกผลิต ส่งต่อ ปิดยอด หรือแพ็กกล่อง —
            กลับรายการได้เมื่อชิ้นงานชุดนั้นยังไม่ถูกส่งต่อหรือแพ็ก
            (กล่องที่ยกเลิกจะกลับเข้า Lot และ QR เดิมใช้ไม่ได้)
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!entries && !error && (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
              <Loader2 className="size-4 animate-spin" /> กำลังโหลดประวัติ…
            </p>
          )}
          {error && (
            <p role="alert" className="py-6 text-sm text-danger">
              {error}
            </p>
          )}
          {entries && entries.length === 0 && (
            <p className="py-10 text-center text-sm text-fg-muted">
              ยังไม่มีการบันทึก
            </p>
          )}
          {entries && entries.length > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {entries.map((e) => (
                <li
                  key={e.requestId}
                  className={
                    e.reversed ? "bg-surface-2/60 px-3 py-2.5" : "px-3 py-2.5"
                  }
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        e.kind === "TRANSFER" || e.kind === "PACK"
                          ? "info"
                          : e.kind === "CLOSE"
                            ? "warning"
                            : "primary"
                      }
                    >
                      {KIND_LABEL[e.kind]}
                    </Badge>
                    <span className="font-mono text-sm font-semibold text-fg">
                      {e.stepCode}
                    </span>
                    <span
                      className={
                        e.reversed
                          ? "text-sm text-fg-muted line-through"
                          : "text-sm text-fg"
                      }
                    >
                      {summary(e)}
                    </span>
                    {e.reversed && (
                      <Badge variant="neutral">กลับรายการแล้ว</Badge>
                    )}
                    {canAct && !e.reversed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-7"
                        disabled={
                          !e.reversible || (orderCompleted && e.kind !== "PACK")
                        }
                        title={
                          !e.reversible
                            ? "ชิ้นงานชุดนี้ถูกส่งต่อ แพ็ก หรือใช้ต่อแล้ว"
                            : orderCompleted && e.kind !== "PACK"
                              ? "ใบสั่งผลิตเสร็จสิ้นแล้ว ยกเลิกได้เฉพาะการแพ็ก"
                              : undefined
                        }
                        onClick={() =>
                          onReverse({
                            lineId,
                            requestId: e.requestId,
                            label: `${KIND_LABEL[e.kind]} ${e.stepCode} ${summary(e)}`,
                          })
                        }
                      >
                        <Undo2 className="size-3.5" /> กลับรายการ
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">
                    {e.lotNos.length > 0 && (
                      <span className="font-mono">
                        {e.lotNos.join(", ")} ·{" "}
                      </span>
                    )}
                    {formatThaiDate(e.productionDate)} กะ {e.shift} ·{" "}
                    {timeOf(e.createdAt)}
                    {e.operatorName ? ` · ${e.operatorName}` : ""}
                    {e.remark ? ` · ${e.remark}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
