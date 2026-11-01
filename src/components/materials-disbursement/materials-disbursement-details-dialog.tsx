"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { FileText, ImageIcon, Factory, PackageMinus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMaterialsDisbursementDetailAction } from "@/app/(dashboard)/materials/disbursements/actions";
import type {
  DisbursementStatus,
  DisbursementType,
  MaterialsDisbursement,
  MaterialsDisbursementDetail,
} from "@/lib/api/materials-disbursement";
import { formatNumber } from "@/lib/utils";

const STATUS_DISPLAY: Record<DisbursementStatus, { label: string; variant: "warning" | "success" | "neutral" }> = {
  draft: { label: "ร่าง", variant: "warning" },
  confirmed: { label: "ยืนยันแล้ว", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "neutral" },
};

const TYPE_META: Record<DisbursementType, { label: string; icon: typeof Factory; tone: string }> = {
  production: { label: "เบิกเพื่อผลิต", icon: Factory, tone: "bg-primary-soft text-primary" },
  stock_cut: { label: "ตัดสต็อก", icon: PackageMinus, tone: "bg-warning-soft text-warning" },
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="break-words text-sm font-medium text-fg">{children}</dd>
    </div>
  );
}

// Read-only "full record" dialog. The row from the list is shown instantly;
// the detail endpoint (which also returns the FIFO box allocations the list
// omits) is fetched on open. Result is keyed by the id it belongs to so
// loading/error are derived by comparison, not reset in an effect.
export function MaterialsDisbursementDetailsDialog({
  disbursement,
  onOpenChange,
}: {
  disbursement: MaterialsDisbursement | null;
  onOpenChange: (open: boolean) => void;
}) {
  const id = disbursement?.id ?? null;
  const [loaded, setLoaded] = React.useState<
    { id: string; detail: MaterialsDisbursementDetail | null; error: string | null } | null
  >(null);

  React.useEffect(() => {
    if (!id) return;
    let active = true;
    getMaterialsDisbursementDetailAction(id).then((result) => {
      if (!active) return;
      setLoaded(
        result.status === "success"
          ? { id, detail: result.disbursement, error: null }
          : { id, detail: null, error: result.message }
      );
    });
    return () => {
      active = false;
    };
  }, [id]);

  const current = loaded && loaded.id === id ? loaded : null;
  const detail = current?.detail ?? null;
  const base = detail ?? disbursement;
  const isLoading = !!id && !current;

  return (
    <Dialog open={!!disbursement} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="flex flex-col">
        {base && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                {(() => {
                  const meta = TYPE_META[base.disbursementType];
                  const Icon = meta.icon;
                  return (
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                      <Icon className="size-5" />
                    </span>
                  );
                })()}
                <div className="min-w-0">
                  <DialogTitle className="flex flex-wrap items-center gap-2">
                    <span className="font-mono">{base.disbursementNo}</span>
                    <Badge variant={STATUS_DISPLAY[base.status].variant}>{STATUS_DISPLAY[base.status].label}</Badge>
                  </DialogTitle>
                  <DialogDescription>
                    {TYPE_META[base.disbursementType].label} · {formatDate(base.disbursementDate)}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <dl className="grid gap-4 sm:grid-cols-3">
                <Field label="สร้างเมื่อ">{formatDateTime(base.createdAt)}</Field>
                <Field label="ยืนยันเมื่อ">{formatDateTime(base.confirmedAt)}</Field>
                <Field label="ยกเลิกเมื่อ">{formatDateTime(base.cancelledAt)}</Field>
                {base.issueReport && (
                  <Field label="รายการแจ้งปัญหา">
                    <Link
                      href={`/reports/issues?search=${encodeURIComponent(base.issueReport.reportNo)}`}
                      className="text-primary underline"
                    >
                      <span className="font-mono">{base.issueReport.reportNo}</span> · {base.issueReport.title}
                    </Link>
                    <span className="block text-xs font-normal text-fg-muted">
                      เอกสาร {base.issueReport.documentNo ?? "—"}
                    </span>
                  </Field>
                )}
                {base.reason && <Field label="เหตุผล">{base.reason}</Field>}
                {base.cancelReason && <Field label="เหตุผลที่ยกเลิก">{base.cancelReason}</Field>}
                {base.remark && <Field label="หมายเหตุ">{base.remark}</Field>}
              </dl>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-fg">รายการวัสดุ ({base.items.length})</h3>
                <ul className="space-y-2">
                  {base.items.map((item) => {
                    const packages =
                      detail?.items.find((d) => d.id === item.id)?.packages.filter((p) => !p.reversedAt) ?? [];
                    return (
                      <li key={item.id} className="rounded-lg border border-border">
                        <div className="flex flex-wrap items-start justify-between gap-2 bg-surface-2 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-fg">
                              <span className="font-mono text-xs text-fg-muted">{item.material?.code ?? "—"}</span>{" "}
                              {item.material?.name ?? ""}
                            </p>
                            {item.reason && (
                              <p className="text-xs text-fg-secondary">
                                เหตุผล: {item.reason}
                                {item.reasonNote ? ` — ${item.reasonNote}` : ""}
                              </p>
                            )}
                          </div>
                          <p className="shrink-0 text-right text-sm tabular-nums text-fg">
                            <span className="text-xs text-fg-muted">ขอเบิก </span>
                            {formatNumber(Number(item.requestedQuantity))}
                            {base.status !== "draft" && (
                              <>
                                <span className="text-xs text-fg-muted"> · จ่ายจริง </span>
                                {formatNumber(Number(item.disbursedQuantity))}
                              </>
                            )}
                          </p>
                        </div>
                        {packages.length > 0 && (
                          <ul className="divide-y divide-border">
                            {packages.map((pkg) => (
                              <li key={pkg.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                                <span className="font-mono text-fg-secondary">
                                  {pkg.fifoOrder ? `#${pkg.fifoOrder} · ` : ""}
                                  {pkg.package?.lotDetailNo ?? pkg.packageId}
                                </span>
                                <span className="tabular-nums text-fg">{formatNumber(Number(pkg.disbursedQuantity))}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {isLoading && (
                  <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <Loader2 className="size-3.5 animate-spin" /> กำลังโหลดกล่อง FIFO…
                  </p>
                )}
                {current?.error && <p className="text-xs text-danger">{current.error}</p>}
              </section>

              {(() => {
                const files =
                  base.attachments && base.attachments.length > 0
                    ? base.attachments
                    : base.attachmentUrl
                      ? [{ url: base.attachmentUrl, name: base.attachmentName ?? "ไฟล์แนบ" }]
                      : [];
                if (files.length === 0) return null;
                return (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-fg">ไฟล์แนบ ({files.length})</h3>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {files.map((file, index) => {
                        const isPdf =
                          file.name.toLowerCase().endsWith(".pdf") || file.url.toLowerCase().endsWith(".pdf");
                        return (
                          <li key={`${file.url}-${index}`} className="overflow-hidden rounded-md border border-border bg-surface">
                            <div className="relative h-56 bg-surface-2">
                              {isPdf ? (
                                <iframe
                                  src={`${file.url}#toolbar=0&navpanes=0`}
                                  title={`ตัวอย่างไฟล์ ${file.name}`}
                                  className="h-full w-full border-0"
                                />
                              ) : (
                                <Image
                                  src={file.url}
                                  alt={`ตัวอย่างไฟล์ ${file.name}`}
                                  fill
                                  unoptimized
                                  sizes="(min-width: 640px) 50vw, 100vw"
                                  className="object-contain p-1"
                                />
                              )}
                            </div>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 border-t border-border px-3 py-2 hover:bg-surface-2"
                            >
                              {isPdf ? (
                                <FileText className="size-4 shrink-0 text-danger" />
                              ) : (
                                <ImageIcon className="size-4 shrink-0 text-success" />
                              )}
                              <span className="min-w-0 truncate text-sm font-medium text-primary underline">
                                {file.name}
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })()}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ปิด
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
