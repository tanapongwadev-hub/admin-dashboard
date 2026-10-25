"use client";

import * as React from "react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateIssueReportAction } from "@/app/(dashboard)/reports/issues/actions";
import type { IssueReport } from "@/lib/api/issue-reports";
import { ISSUE_STATUSES } from "@/lib/issue-reports";

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
    toast.success("อัปเดตสถานะแล้ว");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="lg" fullScreenOnMobile>
        <DialogHeader>
          <DialogTitle>อัปเดตสถานะ {report.reportNo}</DialogTitle>
          <DialogDescription>{report.title}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issue-status">สถานะ</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="issue-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_STATUSES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issue-resolution">ผลการแก้ไข / หมายเหตุ</Label>
            <Textarea
              id="issue-resolution"
              rows={4}
              maxLength={4000}
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
