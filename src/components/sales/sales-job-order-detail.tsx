"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ListChecks,
  Loader2,
  PackageMinus,
  Printer,
  QrCode,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import {
  issueSalesJobOrderAction,
  pickSalesJobOrderAction,
  printSalesJobOrderAction,
} from "@/app/(dashboard)/sales/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import type { SalesJobOrderDetail, SalesPickLine } from "@/lib/api/sales";
import { formatThaiDate, formatThaiDateTime } from "@/lib/filters/sales-filters";
import { SalesJobOrderStatusBadge, SalesOrderStatusBadge } from "./sales-badges";

/** Pick lines grouped by product, first-seen order (backend sorts by code). */
export function groupSalesPickLines(lines: SalesPickLine[]) {
  const groups = new Map<string, { product: SalesPickLine["product"]; lines: SalesPickLine[] }>();
  for (const line of lines) {
    const group = groups.get(line.product.id) ?? { product: line.product, lines: [] };
    group.lines.push(line);
    groups.set(line.product.id, group);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    reserved: g.lines.reduce((s, l) => s + l.reservedQty, 0),
    issued: g.lines.reduce((s, l) => s + l.issuedQty, 0),
  }));
}

/** Every picked, still-open box at its full outstanding quantity. */
export function buildSalesIssueAllItems(lines: SalesPickLine[]) {
  return lines
    .filter((l) => l.pickedAt && !l.releasedAt && l.outstandingQty > 0)
    .map((l) => ({ reservationId: l.id, quantity: l.outstandingQty }));
}

function lineState(line: SalesPickLine) {
  if (line.releaseType === "CANCELLED") return { label: "ปล่อยคืน", variant: "neutral" as const };
  if (line.releaseType === "ISSUED") return { label: "ตัดสต็อกแล้ว", variant: "success" as const };
  if (line.issuedQty > 0) return { label: "ตัดบางส่วน", variant: "warning" as const };
  if (line.pickedAt) return { label: "หยิบแล้ว", variant: "info" as const };
  return { label: "รอหยิบ", variant: "neutral" as const };
}

export function SalesJobOrderDetailView({
  jobOrder: initial,
  canPick,
  canIssue,
  canPrint,
}: {
  jobOrder: SalesJobOrderDetail;
  canPick: boolean;
  canIssue: boolean;
  canPrint: boolean;
}) {
  const router = useRouter();
  const [jobOrder, setJobOrder] = React.useState(initial);
  const [scan, setScan] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [issueOpen, setIssueOpen] = React.useState(false);
  const [printTrigger, setPrintTrigger] = React.useState(0);
  // One idempotency key per issue attempt; a retry after a network error
  // reuses it so the server never cuts twice.
  const issueRequestId = React.useRef<string | null>(null);
  const scanRef = React.useRef<HTMLInputElement>(null);

  const open = jobOrder.status !== "ISSUED" && jobOrder.status !== "CANCELLED";
  const activeLines = jobOrder.pickLines.filter((l) => !l.releasedAt);
  const unpicked = activeLines.filter((l) => !l.pickedAt);
  const issueItems = buildSalesIssueAllItems(jobOrder.pickLines);
  const issueQty = issueItems.reduce((s, i) => s + i.quantity, 0);
  const reservedQty = jobOrder.pickLines.reduce((s, l) => s + l.reservedQty, 0);
  const issuedQty = jobOrder.pickLines.reduce((s, l) => s + l.issuedQty, 0);
  const pickedCount = jobOrder.pickLines.filter((l) => l.pickedAt).length;

  async function pick(code: string, current = jobOrder) {
    return pickSalesJobOrderAction(current.id, { version: current.version, qrCode: code });
  }

  async function handleScan() {
    const code = scan.trim();
    if (!code) return;
    const line = activeLines.find((l) => l.package.qrCode.toUpperCase() === code.toUpperCase());
    if (!line) {
      toast.error(`กล่อง ${code} ไม่ได้อยู่ในใบจัดงานนี้`);
      scanRef.current?.focus();
      return;
    }
    if (line.pickedAt) {
      toast.error(`กล่อง ${code} หยิบแล้ว`);
      return;
    }
    setPending(true);
    const result = await pick(line.package.qrCode);
    setPending(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    setJobOrder(result.jobOrder);
    setScan("");
    scanRef.current?.focus();
    toast.success(`หยิบแล้ว: ${line.product.code} · กล่อง ${line.package.boxNo}`);
  }

  // No bulk endpoint: loop the single pick sequentially, threading the
  // version returned by each call into the next (a stale version 409s).
  async function handlePickAll() {
    setPending(true);
    let current = jobOrder;
    let count = 0;
    for (const line of unpicked) {
      const result = await pick(line.package.qrCode, current);
      if (result.status === "error") {
        toast.error(`${line.package.qrCode}: ${result.message}`);
        break;
      }
      current = result.jobOrder;
      count += 1;
    }
    setPending(false);
    setJobOrder(current);
    if (count) toast.success(`หยิบแล้ว ${count} กล่อง`);
  }

  async function handleIssueAll() {
    if (!issueItems.length) return;
    issueRequestId.current ??= crypto.randomUUID();
    setPending(true);
    const result = await issueSalesJobOrderAction(jobOrder.id, {
      version: jobOrder.version,
      requestId: issueRequestId.current,
      items: issueItems,
    });
    setPending(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    issueRequestId.current = null;
    setJobOrder(result.jobOrder);
    toast.success(`ตัดสต็อกขายแล้ว ${issueQty.toLocaleString("th-TH")} ชิ้น`, {
      description: result.jobOrder.shipments[0]?.issueNo,
    });
    router.refresh();
  }

  async function handlePrint() {
    const result = await printSalesJobOrderAction(jobOrder.id);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    setJobOrder(result.jobOrder);
    setPrintTrigger((n) => n + 1);
  }

  const groups = groupSalesPickLines(jobOrder.pickLines);
  const order = jobOrder.salesOrder;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/sales/job-orders"
        className="inline-flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        ใบจัดงานขายทั้งหมด
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold text-fg">{jobOrder.code}</h1>
            <SalesJobOrderStatusBadge status={jobOrder.status} />
          </div>
          <p className="mt-1 text-sm text-fg-secondary">
            {jobOrder.customer.code} · {jobOrder.customer.nameTh}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            ออเดอร์ <span className="font-mono text-fg">{order.code}</span>
            <SalesOrderStatusBadge status={order.status} />· กำหนดส่ง {formatThaiDate(order.dueDate)}
            {order.customerPo && <>· PO {order.customerPo}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPrint && (
            <Button type="button" variant="outline" onClick={handlePrint} disabled={pending}>
              <Printer className="size-4" />
              พิมพ์ใบจัดงาน{jobOrder.printCount ? ` (${jobOrder.printCount})` : ""}
            </Button>
          )}
          {canIssue && open && (
            <Button
              type="button"
              onClick={() => setIssueOpen(true)}
              disabled={pending || unpicked.length > 0 || issueItems.length === 0}
              title={unpicked.length ? "ต้องหยิบสินค้าให้ครบก่อน" : undefined}
            >
              <PackageMinus className="size-4" />
              ตัดสต็อกขาย
            </Button>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["กล่องที่จอง", `${jobOrder.pickLines.length} กล่อง`],
          ["หยิบแล้ว", `${pickedCount} / ${jobOrder.pickLines.length} กล่อง`],
          ["ตัดสต็อกแล้ว", `${issuedQty.toLocaleString("th-TH")} ชิ้น`],
          ["คงค้าง", `${(reservedQty - issuedQty).toLocaleString("th-TH")} ชิ้น`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-surface px-4 py-3">
            <dt className="text-xs text-fg-muted">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-fg">{value}</dd>
          </div>
        ))}
      </dl>

      {open && canPick && unpicked.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/25 bg-primary-soft/40 p-4">
          <label htmlFor="sales-scan" className="flex items-center gap-2 text-sm font-medium text-fg">
            <QrCode className="size-4 text-primary" />
            สแกน QR กล่อง FG เพื่อหยิบสินค้า
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="sales-scan"
              ref={scanRef}
              autoFocus
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleScan();
                }
              }}
              placeholder="สแกนหรือพิมพ์รหัส QR แล้วกด Enter"
              className="h-10 font-mono"
              disabled={pending}
            />
            <Button type="button" onClick={handleScan} disabled={pending || !scan.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              หยิบ
            </Button>
            <Button type="button" variant="outline" onClick={handlePickAll} disabled={pending}>
              <ListChecks className="size-4" />
              หยิบทั้งหมด ({unpicked.length})
            </Button>
          </div>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-fg">กล่องที่จองไว้ (FIFO)</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface-2 text-left text-xs text-fg-muted">
              <tr>
                <th className="px-3 py-2">QR กล่อง</th>
                <th className="px-3 py-2">Lot ผลิต</th>
                <th className="px-3 py-2 text-right">ในกล่อง</th>
                <th className="px-3 py-2 text-right">จอง</th>
                <th className="px-3 py-2 text-right">ตัดแล้ว</th>
                <th className="px-3 py-2">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <React.Fragment key={group.product.id}>
                  <tr className="border-t border-border bg-surface-2/60">
                    <td colSpan={6} className="px-3 py-2">
                      <span className="font-mono text-xs text-fg-muted">{group.product.code}</span>{" "}
                      <span className="font-medium text-fg">{group.product.name}</span>
                      <span className="ml-2 text-xs text-fg-secondary">
                        ตัดแล้ว {group.issued.toLocaleString("th-TH")} / จอง{" "}
                        {group.reserved.toLocaleString("th-TH")} {group.product.unitName ?? ""}
                      </span>
                    </td>
                  </tr>
                  {group.lines.map((line) => {
                    const state = lineState(line);
                    return (
                      <tr key={line.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs text-fg">{line.package.qrCode}</span>
                          <span className="block text-xs text-fg-muted">กล่อง {line.package.boxNo}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-fg-secondary">
                          {line.package.lotNo}
                          <span className="block text-fg-muted">
                            ผลิต {formatThaiDate(line.package.productionDate)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{line.package.currentQty}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{line.reservedQty}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{line.issuedQty}</td>
                        <td className="px-3 py-2">
                          <Badge variant={state.variant}>{state.label}</Badge>
                          {line.pickedAt && (
                            <span className="mt-0.5 block text-xs text-fg-muted">
                              {line.pickedByName || "—"} · {formatThaiDateTime(line.pickedAt)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Truck className="size-4 text-primary" />
          ประวัติการตัดสต็อกขาย
        </h2>
        {jobOrder.shipments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
            ยังไม่มีการตัดสต็อก
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {jobOrder.shipments.map((s) => (
              <li key={s.issueNo} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-mono font-medium text-fg">{s.issueNo}</span>
                  <span className="ml-2 text-fg-muted">
                    {formatThaiDateTime(s.issuedAt)} · {s.issuedByName || "—"}
                  </span>
                </span>
                <span className="tabular-nums font-semibold text-fg">
                  {s.qty.toLocaleString("th-TH")} ชิ้น · {s.boxCount} กล่อง
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        variant="default"
        title="ยืนยันตัดสต็อกขาย?"
        description={`ตัดสต็อก ${issueItems.length} กล่อง รวม ${issueQty.toLocaleString("th-TH")} ชิ้น ส่งให้ ${jobOrder.customer.nameTh} — สร้างเลขที่ใบส่งของ (DO) และลดยอดสต็อกสินค้าสำเร็จรูปทันที`}
        confirmLabel="ตัดสต็อก"
        onConfirm={handleIssueAll}
      />
      <SalesJobOrderPrintSheet jobOrder={jobOrder} trigger={printTrigger} />
    </div>
  );
}

// Same "print the current document" pattern as the material job order sheet.
function SalesJobOrderPrintSheet({
  jobOrder,
  trigger,
}: {
  jobOrder: SalesJobOrderDetail;
  trigger: number;
}) {
  React.useEffect(() => {
    if (trigger === 0) return;
    const raf = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(raf);
  }, [trigger]);
  if (trigger === 0) return null;
  const groups = groupSalesPickLines(jobOrder.pickLines.filter((l) => !l.releasedAt));
  return createPortal(
    <div data-qr-print-sheet className="hidden p-4 text-black print:block">
      <h1 className="text-base font-semibold">ใบจัดงานขาย {jobOrder.code}</h1>
      <p className="text-sm">
        ออเดอร์ {jobOrder.salesOrder.code} · ลูกค้า {jobOrder.customer.code} {jobOrder.customer.nameTh}
      </p>
      <p className="text-sm">
        กำหนดส่ง {formatThaiDate(jobOrder.salesOrder.dueDate)}
        {jobOrder.salesOrder.customerPo ? ` · PO ${jobOrder.salesOrder.customerPo}` : ""}
      </p>
      {groups.map((group) => (
        <div key={group.product.id} className="mt-3">
          <p className="text-sm font-semibold">
            {group.product.code} · {group.product.name} — {group.reserved - group.issued}{" "}
            {group.product.unitName ?? ""}
          </p>
          <table className="mt-1 w-full border-collapse text-xs">
            <thead>
              <tr>
                {["☐", "QR กล่อง", "Lot", "กล่อง", "จำนวน"].map((h) => (
                  <th key={h} className="border border-black px-2 py-1 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.lines.map((line) => (
                <tr key={line.id}>
                  <td className="border border-black px-2 py-1">☐</td>
                  <td className="border border-black px-2 py-1 font-mono">{line.package.qrCode}</td>
                  <td className="border border-black px-2 py-1">{line.package.lotNo}</td>
                  <td className="border border-black px-2 py-1">{line.package.boxNo}</td>
                  <td className="border border-black px-2 py-1">{line.reservedQty - line.issuedQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="mt-8 grid grid-cols-3 gap-6 text-xs">
        {["ผู้จัดเตรียม", "ผู้หยิบสินค้า", "ผู้ตรวจปล่อย / ผู้รับ"].map((label) => (
          <p key={label} className="border-t border-black pt-1 text-center">{label}</p>
        ))}
      </div>
    </div>,
    document.body,
  );
}
