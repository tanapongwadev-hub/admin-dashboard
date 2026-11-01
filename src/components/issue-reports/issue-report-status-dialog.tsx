"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleAlert,
  CircleDot,
  Loader2,
  Lock,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateIssueReportAction } from "@/app/(dashboard)/reports/issues/actions";
import type { IssueReport } from "@/lib/api/issue-reports";
import {
  ISSUE_DOCUMENT_TYPES,
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_VARIANT,
  ISSUE_STATUSES,
  ISSUE_STATUS_VARIANT,
  labelOf,
  type IssueStatus,
} from "@/lib/issue-reports";
import { cn } from "@/lib/utils";

const RESOLUTION_MAX = 4000;

// One card per status, in workflow order. Icon + hint so the choice is
// readable without relying on color alone.
const STATUS_CHOICES: Record<IssueStatus, { icon: LucideIcon; hint: string; active: string }> = {
  OPEN: { icon: CircleDot, hint: "รับเรื่องแล้ว ยังไม่เริ่ม", active: "border-warning bg-warning-soft" },
  IN_PROGRESS: { icon: Wrench, hint: "กำลังตรวจสอบ/แก้ไข", active: "border-info bg-info-soft" },
  RESOLVED: { icon: CheckCircle2, hint: "แก้ไขเรียบร้อย", active: "border-success bg-success-soft" },
  CLOSED: { icon: Lock, hint: "ปิดเรื่อง ไม่ติดตามต่อ", active: "border-border-strong bg-surface-2" },
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="break-words text-sm font-medium text-fg">{children}</dd>
    </div>
  );
}

// Remounted per target via `key` from the parent, so plain useState
// initializers are enough (no reset-on-open effect).
export function IssueReportStatusDialog({
  report,
  onOpenChange,
  onSaved,
}: {
  report: IssueReport;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = React.useState(report.status);
  const [resolution, setResolution] = React.useState(report.resolution ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  const changed = status !== report.status || resolution.trim() !== (report.resolution ?? "").trim();
  const closing = status === "RESOLVED" || status === "CLOSED";

  async function submit() {
    setSubmitting(true);
    const result = await updateIssueReportAction(report.id, {
      status,
      resolution: resolution.trim() || undefined,
    });
    setSubmitting(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success("อัปเดตสถานะแล้ว", { description: report.reportNo });
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="lg" fullScreenOnMobile className="flex flex-col sm:max-h-[90vh]">
        <DialogHeader className="flex-row items-start gap-3 pr-12">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <CircleAlert className="size-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="flex flex-wrap items-center gap-2">
              อัปเดตสถานะ
              <span className="font-mono text-base">{report.reportNo}</span>
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <span>สถานะปัจจุบัน</span>
              <Badge variant={ISSUE_STATUS_VARIANT[report.status as IssueStatus] ?? "neutral"} dot>
                {labelOf(ISSUE_STATUSES, report.status)}
              </Badge>
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section aria-labelledby="issue-summary-heading" className="rounded-lg border border-border bg-surface-2/40 p-4">
            <h3 id="issue-summary-heading" className="sr-only">
              รายละเอียดปัญหา
            </h3>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 text-base font-semibold text-fg">{report.title}</p>
              <Badge variant={ISSUE_SEVERITY_VARIANT[report.severity] ?? "neutral"}>
                ความรุนแรง{labelOf(ISSUE_SEVERITIES, report.severity)}
              </Badge>
            </div>
            {report.description && (
              <p className="mt-2 whitespace-pre-line text-sm text-fg-secondary">{report.description}</p>
            )}
            <dl className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
              <Meta label="เอกสาร">
                {labelOf(ISSUE_DOCUMENT_TYPES, report.documentType)}
                <span className="block font-mono text-xs font-normal text-fg-secondary">
                  {report.documentNo ?? "—"}
                </span>
              </Meta>
              <Meta label="ผู้แจ้ง">{report.reportedByName ?? report.reportedByUsername ?? "—"}</Meta>
              <Meta label="แจ้งเมื่อ">{formatDateTime(report.createdAt)}</Meta>
            </dl>
          </section>

          <section aria-labelledby="issue-status-label" className="flex flex-col gap-2">
            <span id="issue-status-label" className="text-sm font-medium text-fg">
              เปลี่ยนสถานะเป็น
            </span>
            <div role="radiogroup" aria-labelledby="issue-status-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ISSUE_STATUSES.map((item) => {
                const choice = STATUS_CHOICES[item.value];
                const Icon = choice.icon;
                const selected = status === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setStatus(item.value)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? choice.active : "border-border bg-surface hover:bg-surface-2",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </span>
                    <span className="text-xs text-fg-muted">{choice.hint}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="issue-resolution">
                ผลการแก้ไข / หมายเหตุ
                {closing && <span className="ml-1 text-xs font-normal text-fg-muted">(ควรระบุวิธีแก้ไข)</span>}
              </Label>
              <span className="text-xs tabular-nums text-fg-muted">
                {resolution.length.toLocaleString("th-TH")}/{RESOLUTION_MAX.toLocaleString("th-TH")}
              </span>
            </div>
            <Textarea
              id="issue-resolution"
              rows={4}
              maxLength={RESOLUTION_MAX}
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              placeholder={closing ? "อธิบายว่าแก้ไขอย่างไร เช่น ปรับยอดสต็อกแล้ว" : "บันทึกความคืบหน้า (ถ้ามี)"}
            />
            {report.resolvedAt && (
              <p className="text-xs text-fg-muted">
                ปิดงานเมื่อ {formatDateTime(report.resolvedAt)}
                {report.resolvedByName ? ` โดย ${report.resolvedByName}` : ""}
              </p>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={submit} disabled={submitting || !changed}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
