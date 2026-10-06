"use client";

import {
  ArrowRight,
  Ban,
  Boxes,
  CircleCheck,
  History,
  ClipboardPen,
  Loader2,
  PackageCheck,
  Printer,
  QrCode,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { listLotPackagesAction } from "@/app/(dashboard)/products/process-orders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  BoardLot,
  BoardStep,
  LineBoard,
  LineReconciliation,
  PackageView,
  StepTag,
} from "@/lib/api/production-lots";
import { formatThaiDate } from "@/lib/production-day";
import { cn } from "@/lib/utils";
import { PackDialog } from "./pack-dialog";
import { PackageLabelSheet, type LabelContext } from "./package-label-sheet";
import { ProduceDialog, type RejectReasonOption } from "./produce-dialog";
import { CloseRemainingDialog } from "./close-remaining-dialog";
import { HistoryDialog } from "./history-dialog";
import { ReverseDialog, type ReverseTarget } from "./reverse-dialog";
import { TransferDialog } from "./transfer-dialog";
import { TransferTagsDialog } from "./transfer-tags-dialog";

type Pending =
  | { kind: "produce"; lineId: string; step: BoardStep; session: number }
  | {
      kind: "transfer";
      lineId: string;
      step: BoardStep;
      next: BoardStep;
      session: number;
    }
  | { kind: "pack"; lineId: string; lot: BoardLot; session: number }
  | { kind: "reverse"; target: ReverseTarget; session: number }
  | { kind: "close"; lineId: string; step: BoardStep; session: number }
  | { kind: "history"; lineId: string; session: number }
  | {
      kind: "tags";
      lineId: string;
      /** Step the work was sent into. */
      step: BoardStep;
      /** Present right after a transfer; absent = load for reprint. */
      tags?: StepTag[];
      title?: string;
      session: number;
    };

const fmt = (n: number) => n.toLocaleString("th-TH");

/**
 * Lot-model production order (plan Phase 8): one Process Board per order
 * line. Every action returns the line's fresh board, which replaces the
 * local copy — no page re-fetch (ADR-006 delta pattern).
 */
export function LotOrderBoard({
  orderCode,
  initialBoards,
  rejectReasons,
  canAct,
  canReverse,
  reconciliations = {},
}: {
  orderCode: string;
  initialBoards: LineBoard[];
  rejectReasons: RejectReasonOption[];
  canAct: boolean;
  /** PRODUCTION_ORDER_REVERSE — undo toasts and the history "กลับรายการ". */
  canReverse: boolean;
  /** Per line id, checked when the page loaded (null = check unavailable). */
  reconciliations?: Record<string, LineReconciliation | null>;
}) {
  const router = useRouter();
  const [boards, setBoards] = useState(initialBoards);
  const [pending, setPending] = useState<Pending | null>(null);
  const [session, setSession] = useState(0);
  const [labels, setLabels] = useState<{
    packages: PackageView[];
    context: LabelContext;
  } | null>(null);
  const [reprinting, setReprinting] = useState<string | null>(null);

  const open = (
    p: Pending extends infer P
      ? P extends Pending
        ? Omit<P, "session">
        : never
      : never,
  ) => {
    setSession((s) => s + 1);
    setPending({ ...p, session: session + 1 } as Pending);
  };
  const applyBoard = (board: LineBoard) => {
    // The header badge ("เสร็จสิ้น") is server-rendered: refresh when the order
    // completes or reopens.
    const before = boards.find((b) => b.line.id === board.line.id);
    if (before && before.line.orderStatus !== board.line.orderStatus) {
      router.refresh();
    }
    setBoards((list) =>
      list.map((b) => (b.line.id === board.line.id ? board : b)),
    );
  };
  const clearLabels = useCallback(() => setLabels(null), []);

  function printLabels(
    board: LineBoard,
    packages: PackageView[],
    fgLotNo: string,
  ) {
    setLabels({
      packages,
      context: {
        productCode: board.line.product?.code ?? "",
        productName: board.line.product?.name ?? "",
        orderCode,
        fgLotNo,
      },
    });
  }

  async function reprint(board: LineBoard, lot: BoardLot) {
    setReprinting(lot.id);
    const result = await listLotPackagesAction(lot.id);
    setReprinting(null);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    if (!result.packages.length) {
      toast.info("Lot นี้ยังไม่มีกล่อง");
      return;
    }
    printLabels(board, result.packages, lot.lotNo);
  }

  return (
    <div className="flex flex-col gap-6">
      {boards.map((board) => {
        const { line } = board;
        const pct = line.plannedQty
          ? Math.min(
              100,
              Math.round((line.receivedQty / line.plannedQty) * 100),
            )
          : 0;
        const completed = line.orderStatus === "COMPLETED";
        const act = canAct && !completed;
        return (
          <section
            key={line.id}
            className="flex flex-col gap-3"
            aria-labelledby={`line-${line.id}`}
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-fg-muted">
                  รายการที่ {line.lineNo}
                </p>
                <h2
                  id={`line-${line.id}`}
                  className="text-lg font-semibold text-fg"
                >
                  <span className="font-mono text-primary">
                    {line.product?.code}
                  </span>{" "}
                  {line.product?.name}
                </h2>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                <Kpi label="แผน" value={line.plannedQty} />
                <Kpi
                  label="รับเข้า FG"
                  value={line.receivedQty}
                  tone="success"
                />
                <Kpi
                  label="ของเสีย"
                  value={line.rejectedQty}
                  tone={line.rejectedQty ? "danger" : undefined}
                />
                <Kpi label="ปิดยอด" value={line.shortClosedQty} />
              </dl>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-2"
              aria-label={`รับเข้าแล้ว ${pct}%`}
            >
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${pct}%` }}
              />
            </div>
            {completed && (
              <p className="flex items-center gap-1.5 rounded-md border border-success/40 bg-success-soft px-3 py-2 text-sm font-medium text-success-fg">
                <CircleCheck className="size-4" aria-hidden />{" "}
                ใบสั่งผลิตเสร็จสิ้น — ทุกชิ้นรับเข้าและแพ็กแล้ว เป็นของเสีย
                หรือปิดยอดแล้ว
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <ReconciliationNote result={reconciliations[line.id]} />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => open({ kind: "history", lineId: line.id })}
              >
                <History className="size-3.5" /> ประวัติการบันทึก
              </Button>
            </div>

            <div className="grid gap-3 @container sm:grid-cols-2 xl:grid-cols-4">
              {board.steps.map((step, i) => {
                const next = board.steps[i + 1];
                const isReceiving = step.receivingType !== "NONE";
                const openLots = step.lots.filter(
                  (l) => l.status === "OPEN" && l.remainingQty > 0,
                );
                return (
                  <article
                    key={step.stepIndex}
                    className="flex flex-col rounded-md border border-border bg-surface shadow-sm"
                  >
                    <header className="flex items-center gap-2 border-b border-border px-3 py-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="font-mono text-sm font-semibold text-fg">
                        {step.code}
                      </span>
                      <span className="truncate text-sm text-fg-secondary">
                        {step.name}
                      </span>
                      {i > 0 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="ml-auto size-7"
                          title={`QR ส่งต่อที่เข้า ${step.code}`}
                          aria-label={`QR ส่งต่อที่เข้า ${step.code}`}
                          onClick={() => open({ kind: "tags", lineId: line.id, step })}
                        >
                          <QrCode className="size-4" />
                        </Button>
                      )}
                      {isReceiving && (
                        <Badge variant="success" className={i > 0 ? "" : "ml-auto"}>
                          {step.receivingType}
                        </Badge>
                      )}
                    </header>
                    <dl className="grid grid-cols-2 divide-x divide-border border-b border-border text-center">
                      <div className="p-2">
                        <dt className="text-xs text-fg-muted">
                          {isReceiving ? "รอรับเข้า" : "รอผลิต"}
                        </dt>
                        <dd
                          className={cn(
                            "text-xl font-semibold tabular-nums",
                            step.waitingQty
                              ? "text-warning-fg"
                              : "text-fg-muted",
                          )}
                        >
                          {fmt(step.waitingQty)}
                        </dd>
                      </div>
                      <div className="p-2">
                        <dt className="text-xs text-fg-muted">
                          {isReceiving ? "ยังไม่แพ็ก" : "รอส่งต่อ"}
                        </dt>
                        <dd
                          className={cn(
                            "text-xl font-semibold tabular-nums",
                            step.readyQty ? "text-primary" : "text-fg-muted",
                          )}
                        >
                          {fmt(step.readyQty)}
                        </dd>
                      </div>
                    </dl>
                    <p className="px-3 pt-2 text-xs text-fg-secondary">
                      รับมา {fmt(step.inputQty)} · ผลิตได้{" "}
                      {fmt(step.producedQty)}
                      {step.transferredQty
                        ? ` · ส่งต่อ ${fmt(step.transferredQty)}`
                        : ""}
                      {step.rejectedQty
                        ? ` · เสีย ${fmt(step.rejectedQty)}`
                        : ""}
                    </p>
                    <ul
                      className="flex flex-1 flex-col gap-1 p-3"
                      aria-label={`Lot ที่ ${step.code}`}
                    >
                      {step.lots.length === 0 && (
                        <li className="text-xs text-fg-muted">ยังไม่มี Lot</li>
                      )}
                      {step.lots.map((lot) => (
                        <li
                          key={lot.id}
                          className="flex items-center gap-2 rounded border border-border px-2 py-1"
                        >
                          <Link
                            href={`/production/traceability?q=${encodeURIComponent(lot.lotNo)}`}
                            className="font-mono text-xs font-medium text-primary hover:underline"
                            title="สอบกลับ Lot นี้"
                          >
                            {lot.lotNo}
                          </Link>
                          <span className="text-[11px] text-fg-muted">
                            {formatThaiDate(lot.productionDate)} {lot.shift}
                          </span>
                          <span className="ml-auto text-xs tabular-nums text-fg">
                            {fmt(lot.remainingQty)}
                            <span className="text-fg-muted">
                              /{fmt(lot.producedQty)}
                            </span>
                          </span>
                          {isReceiving && act && lot.remainingQty > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5"
                              aria-label={`แพ็กกล่อง ${lot.lotNo}`}
                              onClick={() =>
                                open({ kind: "pack", lineId: line.id, lot })
                              }
                            >
                              <Boxes className="size-3.5" />
                            </Button>
                          )}
                          {isReceiving &&
                            lot.producedQty > lot.remainingQty && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-1.5"
                                aria-label={`พิมพ์ฉลากกล่องของ ${lot.lotNo}`}
                                disabled={reprinting === lot.id}
                                onClick={() => reprint(board, lot)}
                              >
                                {reprinting === lot.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Printer className="size-3.5" />
                                )}
                              </Button>
                            )}
                        </li>
                      ))}
                    </ul>
                    {act && (
                      <footer className="flex gap-2 border-t border-border p-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="min-w-0 flex-1"
                          disabled={!step.waitingQty}
                          onClick={() =>
                            open({ kind: "produce", lineId: line.id, step })
                          }
                        >
                          {isReceiving ? (
                            <PackageCheck className="size-4 shrink-0" />
                          ) : (
                            <ClipboardPen className="size-4 shrink-0" />
                          )}
                          <span className="truncate">
                            {isReceiving ? "รับเข้า" : "บันทึกผลิต"}
                          </span>
                        </Button>
                        {next && (
                          <Button
                            size="sm"
                            className="min-w-0 flex-1"
                            disabled={!step.readyQty || !openLots.length}
                            onClick={() =>
                              open({
                                kind: "transfer",
                                lineId: line.id,
                                step,
                                next,
                              })
                            }
                          >
                            <span className="truncate">ส่ง {next.code}</span>
                            <ArrowRight className="size-4 shrink-0" />
                          </Button>
                        )}
                        {step.waitingQty > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="shrink-0 px-2"
                            aria-label={`ปิดยอดค้างที่ ${step.code}`}
                            title="ปิดยอดค้าง (ชิ้นงานที่จะไม่ผลิตต่อ)"
                            onClick={() =>
                              open({ kind: "close", lineId: line.id, step })
                            }
                          >
                            <Ban className="size-4" />
                          </Button>
                        )}
                      </footer>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <Link
        href="/production/traceability"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Search className="size-4" aria-hidden /> สแกน QR / ค้นหา Lot
        เพื่อสอบกลับ
      </Link>

      {pending?.kind === "produce" && (
        <ProduceDialog
          key={pending.session}
          lineId={pending.lineId}
          step={pending.step}
          rejectReasons={rejectReasons}
          onClose={() => setPending(null)}
          onDone={(b, splits) => {
            applyBoard(b);
            if (splits.length) {
              open({
                kind: "tags",
                lineId: pending.lineId,
                step: pending.step,
                tags: splits,
                title: `QR ใหม่ของกล่องที่แบ่ง · ${pending.step.code}`,
              });
            } else {
              setPending(null);
            }
          }}
          onUndo={canReverse ? (target) => open({ kind: "reverse", target }) : undefined}
        />
      )}
      {pending?.kind === "history" && (
        <HistoryDialog
          key={pending.session}
          lineId={pending.lineId}
          canAct={canReverse}
          orderCompleted={
            boards.find((b) => b.line.id === pending.lineId)?.line
              .orderStatus === "COMPLETED"
          }
          onClose={() => setPending(null)}
          onReverse={(target) => open({ kind: "reverse", target })}
        />
      )}
      {pending?.kind === "close" && (
        <CloseRemainingDialog
          key={pending.session}
          lineId={pending.lineId}
          step={pending.step}
          onClose={() => setPending(null)}
          onDone={(b) => {
            applyBoard(b);
            setPending(null);
          }}
          onUndo={canReverse ? (target) => open({ kind: "reverse", target }) : undefined}
        />
      )}
      {pending?.kind === "reverse" && (
        <ReverseDialog
          key={pending.session}
          target={pending.target}
          onClose={() => setPending(null)}
          onDone={(b) => {
            applyBoard(b);
            setPending(null);
          }}
        />
      )}
      {pending?.kind === "transfer" && (
        <TransferDialog
          key={pending.session}
          lineId={pending.lineId}
          step={pending.step}
          next={pending.next}
          defaultPackSize={boards.find((b) => b.line.id === pending.lineId)?.line.packingQty ?? 100}
          onClose={() => setPending(null)}
          onDone={(b, tags) => {
            applyBoard(b);
            if (tags.length) {
              open({ kind: "tags", lineId: pending.lineId, step: pending.next, tags });
            } else {
              setPending(null);
            }
          }}
          onUndo={canReverse ? (target) => open({ kind: "reverse", target }) : undefined}
        />
      )}
      {pending?.kind === "tags" && (
        <TransferTagsDialog
          key={pending.session}
          lineId={pending.lineId}
          stepIndex={pending.step.stepIndex}
          title={pending.title ?? `QR ส่งต่อ → ${pending.step.code} ${pending.step.name}`}
          context={{
            productCode: boards.find((b) => b.line.id === pending.lineId)?.line.product?.code ?? "",
            productName: boards.find((b) => b.line.id === pending.lineId)?.line.product?.name ?? "",
            orderCode,
            toStep: `${pending.step.code} ${pending.step.name}`,
          }}
          initialTags={pending.tags}
          onClose={() => setPending(null)}
        />
      )}
      {pending?.kind === "pack" && (
        <PackDialog
          key={pending.session}
          lineId={pending.lineId}
          lot={pending.lot}
          onClose={() => setPending(null)}
          onDone={applyBoard}
          onUndo={canReverse ? (target) => open({ kind: "reverse", target }) : undefined}
          onPrint={(packages, fgLotNo) => {
            const board = boards.find((b) => b.line.id === pending.lineId);
            if (board) printLabels(board, packages, fgLotNo);
          }}
        />
      )}
      <PackageLabelSheet
        packages={labels?.packages ?? null}
        context={labels?.context ?? null}
        onDone={clearLabels}
      />
    </div>
  );
}

/** Result of the server-side consistency check (state vs ledger vs origins). */
function ReconciliationNote({
  result,
}: {
  result: LineReconciliation | null | undefined;
}) {
  if (!result) return null;
  const at = new Date(result.checkedAt).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (result.ok) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-success-fg">
        <ShieldCheck className="size-3.5" aria-hidden />{" "}
        ยอดทุกขั้นตรงกับประวัติการบันทึก ({result.checks} รายการตรวจ · {at})
      </p>
    );
  }
  return (
    <div
      role="alert"
      className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-xs text-danger-fg"
    >
      <p className="flex items-center gap-1.5 font-semibold">
        <ShieldAlert className="size-3.5" aria-hidden /> ยอดไม่ตรงกัน{" "}
        {result.issues.length} จุด — แจ้งผู้ดูแลระบบ ({at})
      </p>
      <ul className="mt-1 list-disc pl-5">
        {result.issues.slice(0, 5).map((i, n) => (
          <li key={n}>
            {i.check}: {i.ref} ควรเป็น {i.expected} แต่เป็น {i.actual}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "danger";
}) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd
        className={cn(
          "font-semibold tabular-nums",
          tone === "success"
            ? "text-success-fg"
            : tone === "danger"
              ? "text-danger-fg"
              : "text-fg",
        )}
      >
        {fmt(value)}
      </dd>
    </div>
  );
}
