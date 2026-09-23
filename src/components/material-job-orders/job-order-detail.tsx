"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  PackageMinus,
  Printer,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import {
  issueMaterialJobOrderAction,
  pickMaterialJobOrderAction,
  printMaterialJobOrderAction,
} from "@/app/(dashboard)/materials/job-orders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import type {
  MaterialJobOrderDetail,
  MaterialJobOrderPickLine,
} from "@/lib/api/material-job-orders";
import { groupPickLinesByMaterial } from "@/lib/group-pick-lines";
import {
  buildAllOutstandingIssueItems,
  getIssueEligiblePickLines,
} from "@/lib/material-job-order-issue";
import { formatNumber } from "@/lib/utils";
import { MaterialJobOrderIssueDialog } from "./job-order-issue-dialog";
import { MaterialJobOrderPrintSheet } from "./job-order-print-sheet";
import { STATUS } from "./job-order-table";

const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "—";

function pickStatusBadge(status: string) {
  if (status === "cancelled" || status === "damaged")
    return { label: "ใช้งานไม่ได้", variant: "danger" as const };
  if (status === "partial") return { label: "เหลือบางส่วน", variant: "warning" as const };
  if (status === "issued") return { label: "จ่ายออกแล้ว", variant: "success" as const };
  return { label: "พร้อมหยิบ", variant: "info" as const };
}

export function MaterialJobOrderDetailView({
  jobOrder: initial,
  canPick,
  canIssue,
  canPrint,
  autoPrint,
}: {
  jobOrder: MaterialJobOrderDetail;
  canPick: boolean;
  canIssue: boolean;
  canPrint: boolean;
  autoPrint: boolean;
}) {
  const router = useRouter();
  const [jobOrder, setJobOrder] = React.useState(initial);
  const [scanCode, setScanCode] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [issueOpen, setIssueOpen] = React.useState(false);
  const [issueAllOpen, setIssueAllOpen] = React.useState(false);
  const [issueAllPending, setIssueAllPending] = React.useState(false);
  const [printRequest, setPrintRequest] = React.useState(0);
  const printedOnceRef = React.useRef(false);

  React.useEffect(() => {
    if (!autoPrint || printedOnceRef.current) return;
    printedOnceRef.current = true;
    void handlePrint();
    // Strip ?print=1 so a later router.refresh() doesn't re-trigger it.
    router.replace(`/materials/job-orders/${jobOrder.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint]);

  async function handlePrint() {
    const result = await printMaterialJobOrderAction(jobOrder.id);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    setJobOrder(result.jobOrder);
    setPrintRequest((n) => n + 1);
  }

  async function handleScanPick() {
    const code = scanCode.trim();
    if (!code) return;
    const line = jobOrder.pickLines.find(
      (l) => l.qrCode === code && !l.pickedAt && !l.releasedAt,
    );
    if (!line) {
      toast.error("ไม่พบ QR นี้ในรายการที่ต้องหยิบของใบจัดงานนี้");
      return;
    }
    setPending(true);
    const result = await pickMaterialJobOrderAction(jobOrder.id, {
      version: jobOrder.version,
      reservationId: line.reservationId,
      scannedCode: code,
    });
    setPending(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    setJobOrder(result.jobOrder);
    setScanCode("");
    toast.success(`หยิบแล้ว: ${line.materialCode} · กล่อง ${line.packageNo}`);
  }

  const unpickedLines = jobOrder.pickLines.filter(
    (line) => !line.releasedAt && !line.pickedAt,
  );
  const outstandingUnpicked = unpickedLines.length;

  // "หยิบทั้งหมด" — confirms every remaining box in one click instead of
  // scanning each QR individually. Reuses the same single-line pick action
  // sequentially (not a new bulk endpoint): each call must carry the
  // *current* version, so the loop threads the updated job order from one
  // call into the next rather than firing all calls off the initial state.
  async function handlePickAll() {
    const skippedNoQr = unpickedLines.filter((line) => !line.qrCode);
    const pickable = unpickedLines.filter((line) => line.qrCode);
    if (pickable.length === 0) {
      toast.error("ไม่มีรายการที่หยิบได้");
      return;
    }
    setPending(true);
    let current = jobOrder;
    let pickedCount = 0;
    for (const line of pickable) {
      const result = await pickMaterialJobOrderAction(current.id, {
        version: current.version,
        reservationId: line.reservationId,
        scannedCode: line.qrCode as string,
      });
      if (result.status === "error") {
        toast.error(`${line.materialCode} · กล่อง ${line.packageNo}: ${result.message}`);
        break;
      }
      current = result.jobOrder;
      pickedCount += 1;
    }
    setPending(false);
    setJobOrder(current);
    if (pickedCount > 0) {
      toast.success(`หยิบแล้ว ${pickedCount} กล่อง`);
    }
    if (skippedNoQr.length > 0) {
      toast.error(`ข้าม ${skippedNoQr.length} กล่องที่ไม่มี QR — กรุณาหยิบด้วยการสแกน`);
    }
  }

  const eligibleIssueLines = getIssueEligiblePickLines(jobOrder.pickLines);
  const issueAllQuantity = eligibleIssueLines.reduce(
    (sum, line) => sum + Number(line.outstandingQuantity),
    0,
  );

  async function handleIssueAll() {
    const items = buildAllOutstandingIssueItems(jobOrder.pickLines);
    if (items.length === 0 || issueAllPending) return;

    setIssueAllPending(true);
    const result = await issueMaterialJobOrderAction(jobOrder.id, {
      version: jobOrder.version,
      items,
    });
    setIssueAllPending(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }

    setJobOrder(result.jobOrder);
    toast.success("ตัดสต็อกทั้งหมดแล้ว", { description: jobOrder.code });
    router.refresh();
  }

  const canOpenIssue =
    canIssue &&
    (jobOrder.status === "READY_TO_ISSUE" || jobOrder.status === "PARTIALLY_ISSUED");
  const materialGroups = groupPickLinesByMaterial(jobOrder.pickLines);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xl font-semibold text-fg">
              {jobOrder.code}
            </h1>
            <Badge variant={STATUS[jobOrder.status].variant} dot>
              {STATUS[jobOrder.status].label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            แผนการผลิต{" "}
            <Link
              href={`/production/plans`}
              className="font-mono text-primary hover:underline"
            >
              {jobOrder.productionPlan.code}
            </Link>{" "}
            · อนุมัติเมื่อ {date(jobOrder.productionPlan.approvedAt)}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {canPrint && jobOrder.status !== "CANCELLED" && (
            <Button type="button" variant="outline" onClick={() => void handlePrint()}>
              <Printer className="size-4" />
              พิมพ์ใบจัดงาน
              {jobOrder.printCount > 0 && (
                <span className="text-xs text-fg-muted">
                  (พิมพ์แล้ว {jobOrder.printCount} ครั้ง)
                </span>
              )}
            </Button>
          )}
          {canOpenIssue && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={issueAllPending}
                onClick={() => setIssueOpen(true)}
              >
                <ClipboardCheck className="size-4" />
                จ่ายออกบางส่วน
              </Button>
              <Button
                type="button"
                disabled={issueAllPending || eligibleIssueLines.length === 0}
                onClick={() => setIssueAllOpen(true)}
              >
                <PackageMinus className="size-4" />
                {issueAllPending ? "กำลังตัดสต็อก..." : "ตัดสต็อกทั้งหมด"}
              </Button>
            </>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-fg-muted">
          รายการสินค้าที่ผลิต
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobOrder.productionPlan.lines.map((line) => (
            <div key={line.id} className="rounded-lg border border-border p-3">
              <p className="font-medium text-fg">
                {line.productCode} · {line.productName}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                ผลิต {formatNumber(line.quantity)} · ต้องการใช้ {date(line.needByDate)}
              </p>
              {line.bomVersion && (
                <p className="text-xs text-fg-muted">BOM {line.bomVersion}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-fg-muted">วัสดุที่ต้องใช้</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-fg-muted">
              <tr>
                <th className="px-3 py-2">วัสดุ</th>
                <th className="px-3 py-2">กันไว้ (Reserved)</th>
                <th className="px-3 py-2">จ่ายออกแล้ว (Issued)</th>
                <th className="px-3 py-2">คงเหลือ (Outstanding)</th>
              </tr>
            </thead>
            <tbody>
              {jobOrder.materials.map((material) => (
                <tr key={material.materialCode} className="border-t border-border">
                  <td className="px-3 py-2">
                    {material.materialCode} · {material.materialName}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatNumber(Number(material.reserved))}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatNumber(Number(material.issued))}
                  </td>
                  <td className="px-3 py-2 tabular-nums font-medium">
                    {formatNumber(Number(material.outstanding))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {canPick && jobOrder.status !== "CANCELLED" && jobOrder.status !== "ISSUED" && (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-medium text-fg-muted">
            สแกน/พิมพ์ QR เพื่อยืนยันการหยิบสินค้า
          </h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleScanPick();
            }}
          >
            <div className="relative max-w-sm flex-1">
              <QrCode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
              <Input
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="สแกนหรือพิมพ์ QR ของกล่อง..."
                className="pl-9 font-mono"
                disabled={pending}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={pending || !scanCode.trim()}>
              ยืนยันหยิบ
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || outstandingUnpicked === 0}
              onClick={() => void handlePickAll()}
            >
              <ListChecks className="size-4" />
              หยิบทั้งหมด
              {outstandingUnpicked > 0 && (
                <span className="text-xs text-fg-muted">({outstandingUnpicked})</span>
              )}
            </Button>
          </form>
          {outstandingUnpicked === 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="size-4" />
              หยิบครบทุกรายการแล้ว พร้อมจ่ายออก
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border px-4 py-3 text-sm font-medium text-fg-muted">
          รายการที่ต้องหยิบ ({jobOrder.pickLines.length} กล่อง ·{" "}
          {materialGroups.length} วัสดุ)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-fg-muted">
              <tr>
                <th className="px-3 py-2">QR</th>
                <th className="px-3 py-2">Lot ภายใน</th>
                <th className="px-3 py-2">Lot ผู้ผลิต</th>
                <th className="px-3 py-2">กล่อง</th>
                <th className="px-3 py-2">คงเหลือในกล่อง</th>
                <th className="px-3 py-2">กันไว้</th>
                <th className="px-3 py-2">จ่ายออกแล้ว</th>
                <th className="px-3 py-2">สถานะกล่อง</th>
                <th className="px-3 py-2">หยิบแล้ว</th>
              </tr>
            </thead>
            <tbody>
              {materialGroups.map((group) => (
                <React.Fragment key={group.materialCode}>
                  <tr className="border-t border-border bg-surface-2">
                    <td colSpan={9} className="px-3 py-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold text-fg">
                          {group.materialCode} · {group.materialName}
                        </span>
                        <span className="text-xs text-fg-muted">
                          {group.lines.length} กล่อง · กันไว้{" "}
                          {formatNumber(group.reserved)} · จ่ายออกแล้ว{" "}
                          {formatNumber(group.issued)} · คงเหลือ{" "}
                          {formatNumber(group.outstanding)}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {group.lines.map((line: MaterialJobOrderPickLine) => {
                    const badge = pickStatusBadge(line.status);
                    return (
                      <tr key={line.reservationId} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-xs">
                          {line.qrCode ?? "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{line.internalLotNo}</td>
                        <td className="px-3 py-2 font-mono text-xs">{line.supplierLotNo}</td>
                        <td className="px-3 py-2">{line.packageNo}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatNumber(Number(line.currentQuantity))}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatNumber(Number(line.reservedQuantity))}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatNumber(Number(line.issuedQuantity))}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={badge.variant} dot>
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          {line.releasedAt ? (
                            <span className="text-fg-muted">จ่ายออกแล้ว</span>
                          ) : line.pickedAt ? (
                            <span className="flex items-center gap-1 text-success">
                              <CheckCircle2 className="size-4" />
                              หยิบแล้ว
                            </span>
                          ) : (
                            <span className="text-fg-muted">ยังไม่หยิบ</span>
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

      {jobOrder.disbursements.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-medium text-fg-muted">
            ใบจ่ายออกที่สร้างจากใบจัดงานนี้
          </h2>
          <ul className="space-y-1 text-sm">
            {jobOrder.disbursements.map((d) => (
              <li key={d.id} className="flex items-center gap-2">
                <Link
                  href="/materials/materials-disbursement"
                  className="font-mono text-primary hover:underline"
                >
                  {d.disbursementNo}
                </Link>
                <span className="text-fg-muted">
                  ยืนยันเมื่อ {date(d.confirmedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MaterialJobOrderIssueDialog
        key={`issue-${jobOrder.id}-${jobOrder.version}`}
        open={issueOpen}
        jobOrder={jobOrder}
        onOpenChange={setIssueOpen}
        onIssued={(updated) => {
          setJobOrder(updated);
          setIssueOpen(false);
          router.refresh();
        }}
      />
      <ConfirmDialog
        open={issueAllOpen}
        onOpenChange={setIssueAllOpen}
        title="ตัดสต็อกทั้งหมดหรือไม่?"
        description={`ระบบจะตัดสต็อกที่คงเหลือ ${formatNumber(issueAllQuantity)} หน่วย จาก ${eligibleIssueLines.length} กล่อง และไม่สามารถย้อนกลับจากหน้าใบจ่ายออกได้`}
        confirmLabel="ตัดสต็อกทั้งหมด"
        variant="danger"
        onConfirm={() => void handleIssueAll()}
      />
      <MaterialJobOrderPrintSheet jobOrder={jobOrder} trigger={printRequest} />
    </div>
  );
}
