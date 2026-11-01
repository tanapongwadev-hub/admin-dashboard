"use client";

import * as React from "react";
import { toast } from "sonner";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { IssueReport } from "@/lib/api/issue-reports";
import { createIssueReportAction } from "@/app/(dashboard)/reports/issues/actions";
import { ISSUE_SEVERITIES, ISSUE_TITLE_OTHER, ISSUE_TITLE_PRESETS } from "@/lib/issue-reports";
import { cn } from "@/lib/utils";

const SEVERITY_TONE: Record<string, string> = {
  LOW: "border-border-strong bg-surface-2",
  MEDIUM: "border-warning bg-warning-soft",
  HIGH: "border-danger bg-danger-soft",
};

// Issue report raised inside another form (no dialog on top of a dialog).
// Document type/number come from the host document; the number may be empty
// while that document is still being created — the backend fills it in when
// the host document is saved. Plain state: the parent mounts it per use.
export function IssueReportInlineForm({
  idPrefix,
  documentType,
  documentNo,
  onCreated,
  onCancel,
}: {
  idPrefix: string;
  documentType: string;
  documentNo?: string;
  onCreated: (report: IssueReport) => void;
  onCancel: () => void;
}) {
  const [titleChoice, setTitleChoice] = React.useState("");
  const [titleOther, setTitleOther] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [severity, setSeverity] = React.useState("MEDIUM");
  const [attempted, setAttempted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const title = titleChoice === ISSUE_TITLE_OTHER ? titleOther.trim() : titleChoice;
  const titleError = !attempted
    ? undefined
    : !titleChoice
      ? "กรุณาเลือกหัวข้อปัญหา"
      : !title
        ? "กรุณาพิมพ์หัวข้อปัญหา"
        : title.length > 200
          ? "หัวข้อต้องไม่เกิน 200 ตัวอักษร"
          : undefined;

  async function save() {
    setAttempted(true);
    if (!title || title.length > 200) return;
    setSaving(true);
    const result = await createIssueReportAction({
      documentType,
      documentNo: documentNo || undefined,
      title,
      description: description.trim() || undefined,
      severity,
    });
    setSaving(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    if (result.report) {
      toast.success("แจ้งปัญหาแล้ว", { description: result.report.reportNo });
      onCreated(result.report);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-warning/50 bg-warning-soft/30 p-3">
      <div className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning-fg" aria-hidden="true" />
        <p className="text-xs text-fg-secondary">
          {documentNo
            ? `แจ้งปัญหาของเอกสาร ${documentNo}`
            : "แจ้งปัญหาของเอกสารนี้ — ระบบจะใส่เลขที่เอกสารให้เมื่อบันทึกรายการจ่ายออก"}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`}>หัวข้อปัญหา</Label>
        <Select value={titleChoice} onValueChange={setTitleChoice}>
          <SelectTrigger
            id={`${idPrefix}-title`}
            aria-invalid={!!titleError}
            aria-describedby={titleError ? `${idPrefix}-title-error` : undefined}
          >
            <SelectValue placeholder="เลือกหัวข้อปัญหา" />
          </SelectTrigger>
          <SelectContent>
            {[...ISSUE_TITLE_PRESETS, ISSUE_TITLE_OTHER].map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {titleChoice === ISSUE_TITLE_OTHER && (
          <Input
            aria-label="หัวข้อปัญหา (พิมพ์เอง)"
            value={titleOther}
            onChange={(e) => setTitleOther(e.target.value)}
            placeholder="พิมพ์หัวข้อปัญหา"
            maxLength={200}
            aria-invalid={!!titleError}
          />
        )}
        <FieldError id={`${idPrefix}-title-error`} message={titleError} />
      </div>

      <div className="space-y-1.5">
        <span id={`${idPrefix}-severity`} className="text-sm font-medium text-fg">
          ความรุนแรง
        </span>
        <div role="radiogroup" aria-labelledby={`${idPrefix}-severity`} className="grid grid-cols-3 gap-2">
          {ISSUE_SEVERITIES.map((item) => {
            const selected = severity === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSeverity(item.value)}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-sm font-medium text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? SEVERITY_TONE[item.value] : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-description`}>รายละเอียด (ถ้ามี)</Label>
        <Textarea
          id={`${idPrefix}-description`}
          rows={2}
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="อธิบายสิ่งที่ผิดปกติ"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          ยกเลิก
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          บันทึกรายการแจ้งปัญหา
        </Button>
      </div>
    </div>
  );
}
