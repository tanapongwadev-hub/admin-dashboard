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
import { listLotPackagesAction, listStepTagsAction } from "@/app/(dashboard)/production/products/orders/actions";
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
import { TransferTagSheet, type TagLabelContext } from "./transfer-tag-sheet";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

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
  const [printingStep, setPrintingStep] = useState<string | null>(null);
  const [pendingLabels, setPendingLabels] = useState<{
    tags: StepTag[];
    context: TagLabelContext;
  } | null>(null);
  const clearPendingLabels = useCallback(() => setPendingLabels(null), []);

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
        targetType: board.line.targetType,
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

  async function printPendingWork(board: LineBoard, step: BoardStep) {
    if (printingStep || pendingLabels) return;
    setPrintingStep(`${board.line.id}:${step.stepIndex}`);
    try {
      const result = await listStepTagsAction(board.line.id, step.stepIndex);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      // Fetch current box balances; the board may predate a production/split.
      const tags = result.tags.filter((tag) =>
        (tag.status === "WAITING" || tag.status === "PARTIAL") && tag.left > 0,
      );
      if (!tags.length) {
        toast.info("ไม่มี QR ของกล่องงานค้างในกระบวนการนี้");
        return;
      }
      setPendingLabels({
        tags,
        context: {
          productCode: board.line.product?.code ?? "",
          productName: board.line.product?.name ?? "",
          orderCode,
          toStep: `${step.code} ${step.name}`,
        },
      });
    } catch {
      toast.error(CONNECTION_ERROR_MESSAGE);
    } finally {
      setPrintingStep(null);
    }
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
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-6"
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
              role="progressbar"
              aria-label={line.targetType === "material" ? "ความคืบหน้าการรับเข้าวัตถุดิบภายใน" : "ความคืบหน้าการรับเข้าสินค้าสำเร็จรูป"}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-fg-muted">รับเข้า{line.targetType === "material" ? "วัตถุดิบภายใน" : "สินค้าสำเร็จรูป"}แล้ว {pct}% ของแผน</p>
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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-fg">เส้นทางการผลิต</h3>
              <p className="text-xs text-fg-muted">{board.steps.length} ขั้นตอน · ยอดในแต่ละขั้นแสดงเป็นชิ้น</p>
            </div>
            <ol className="flex flex-col" aria-label="ลำดับขั้นตอนการผลิต">
              {board.steps.map((step, i) => {
                const next = board.steps[i + 1];
                const isReceiving = step.receivingType !== "NONE";
                const openLots = step.lots.filter(
                  (l) => l.status === "OPEN" && l.remainingQty > 0,
                );
                // A line can have work at several steps at once. A drained
                // step is not necessarily finished: more work may arrive.
                const active = step.waitingQty > 0 || step.readyQty > 0;
                const seen = step.inputQty > 0 || step.producedQty > 0 || step.rejectedQty > 0 || step.closedQty > 0;
                const status = active ? "มีงานค้าง" : seen ? "ไม่มีงานค้าง" : "ยังไม่มีงานเข้า";
                return (
                  <li
                    key={step.stepIndex}
                    className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-5"
                  >
                    {next && <span aria-hidden className="absolute bottom-0 left-4 top-10 w-px bg-border-strong sm:left-6 sm:top-12" />}
                    <span aria-hidden className={cn("relative z-10 mt-1 flex size-8 items-center justify-center rounded-full border-2 text-sm font-semibold sm:size-12", active ? "border-primary bg-primary-soft text-primary" : "border-border-strong bg-surface text-fg-muted")}>
                      {i + 1}
                    </span>
                    <article className={cn("min-w-0 rounded-xl border bg-surface shadow-sm", active ? "border-primary/40" : "border-border")}>
                      <header className="flex flex-wrap items-center gap-2 rounded-t-xl border-b border-border bg-surface-2/50 px-4 py-3">
                        <span className="sr-only">
                          {i + 1}
                        </span>
                        <span className="font-mono text-sm font-semibold text-fg">
                          {step.code}
                        </span>
                        <span className="min-w-0 break-words text-sm font-medium text-fg">
                          {step.name}
                        </span>
                        <Badge variant={active ? "info" : "neutral"}>{status}</Badge>
                        {i > 0 && step.waitingQty > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            aria-label={`พิมพ์ QR งานค้าง ${step.code} ${step.name}`}
                            disabled={printingStep !== null || pendingLabels !== null}
                            onClick={() => printPendingWork(board, step)}
                          >
                            {printingStep === `${line.id}:${step.stepIndex}`
                              ? <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              : <Printer className="size-3.5" aria-hidden />}
                            พิมพ์ QR งานค้าง
                          </Button>
                        )}
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
                      <div className="grid min-w-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
                      <div className="border-b border-border bg-surface-2/30 lg:border-b-0 lg:border-r">
                      <dl className="grid grid-cols-2 divide-x divide-border text-center">
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
                      <p className="px-4 pb-3 pt-2 text-xs leading-relaxed text-fg-secondary">
                        รับมา {fmt(step.inputQty)} · ผลิตได้{" "}
                        {fmt(step.producedQty)}
                        {step.transferredQty
                          ? ` · ส่งต่อ ${fmt(step.transferredQty)}`
                          : ""}
                        {step.rejectedQty
                          ? ` · เสีย ${fmt(step.rejectedQty)}`
                          : ""}
                        {step.closedQty ? ` · ปิดยอด ${fmt(step.closedQty)}` : ""}
                      </p>
                      </div>
                      <ul
                        className="flex min-w-0 flex-col gap-2 p-4"
                        aria-label={`Lot ที่ ${step.code}`}
                      >
                        {step.lots.length === 0 && (
                          <li className="flex min-h-16 items-center justify-center rounded-lg border border-dashed border-border px-3 text-xs text-fg-muted">ยังไม่มี Lot ที่บันทึกในขั้นตอนนี้</li>
                        )}
                        {step.lots.map((lot) => (
                          <li
                            key={lot.id}
                            className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2"
                          >
                            <Link
                              href={`/reports/production?q=${encodeURIComponent(lot.lotNo)}`}
                              className="min-w-0 break-all font-mono text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
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
                      </div>
                      {act && (
                        <footer className="flex flex-wrap gap-2 border-t border-border px-4 py-3 sm:justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="min-w-0 flex-1 sm:flex-none"
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
                              className="min-w-0 flex-1 sm:flex-none"
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
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      <Link
        href="/reports/production"
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
      {pendingLabels && (
        <TransferTagSheet
          tags={pendingLabels.tags}
          context={pendingLabels.context}
          remainingOnly
          onDone={clearPendingLabels}
        />
      )}
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
