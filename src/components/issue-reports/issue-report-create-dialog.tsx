"use client";

import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { createIssueReportAction } from "@/app/(dashboard)/reports/issues/actions";
import { ISSUE_DOCUMENT_TYPES } from "@/lib/issue-reports";
import { cn } from "@/lib/utils";

const DESCRIPTION_MAX = 4000;

const schema = z.object({
  documentType: z.string().min(1, "กรุณาเลือกประเภทเอกสาร"),
  documentNo: z
    .string()
    .trim()
    .min(1, "กรุณากรอกเลขที่เอกสาร")
    .max(100, "เลขที่เอกสารต้องไม่เกิน 100 ตัวอักษร"),
  title: z
    .string()
    .trim()
    .min(1, "กรุณากรอกหัวข้อปัญหา")
    .max(200, "หัวข้อต้องไม่เกิน 200 ตัวอักษร"),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, "รายละเอียดต้องไม่เกิน 4,000 ตัวอักษร"),
  severity: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

// Severity is a 3-way radio group: the choice is small and each level has a
// meaning worth seeing at once, so cards beat a dropdown here.
const SEVERITY_CHOICES = [
  {
    value: "LOW",
    label: "ต่ำ",
    hint: "ไม่กระทบงาน",
    dot: "bg-fg-muted",
    active: "border-border-strong bg-surface-2",
  },
  {
    value: "MEDIUM",
    label: "ปานกลาง",
    hint: "กระทบบางส่วน",
    dot: "bg-warning",
    active: "border-warning bg-warning-soft",
  },
  {
    value: "HIGH",
    label: "สูง",
    hint: "ต้องแก้ด่วน",
    dot: "bg-danger",
    active: "border-danger bg-danger-soft",
  },
] as const;

export function IssueReportCreateDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      documentType: "",
      documentNo: "",
      title: "",
      description: "",
      severity: "MEDIUM",
    },
  });
  const description = useWatch({ control, name: "description" }) ?? "";

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await createIssueReportAction({
      documentType: values.documentType,
      documentNo: values.documentNo,
      title: values.title,
      description: values.description || undefined,
      severity: values.severity,
    });
    setSubmitting(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success("แจ้งปัญหาแล้ว");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" fullScreenOnMobile>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col sm:max-h-[90vh]"
        >
          <DialogHeader className="flex-row items-start gap-3 pr-12">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-fg">
              <CircleAlert className="size-5" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle>แจ้งปัญหาเอกสาร</DialogTitle>
              <DialogDescription>
                ระบุเอกสารที่พบปัญหาและอธิบายสิ่งที่ผิดปกติ
                ทีมที่เกี่ยวข้องจะติดตามสถานะในรายการแจ้งปัญหา
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <section aria-labelledby="issue-doc-heading" className="flex flex-col gap-3">
              <h3
                id="issue-doc-heading"
                className="text-xs font-semibold uppercase tracking-wide text-fg-secondary"
              >
                เอกสารที่เกี่ยวข้อง
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="issue-doc-type">ประเภทเอกสาร</Label>
                  <Controller
                    control={control}
                    name="documentType"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value)}
                      >
                        <SelectTrigger
                          id="issue-doc-type"
                          aria-invalid={!!errors.documentType}
                          aria-describedby="issue-doc-type-error"
                        >
                          <SelectValue placeholder="เลือกประเภทเอกสาร" />
                        </SelectTrigger>
                        <SelectContent>
                          {ISSUE_DOCUMENT_TYPES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError
                    id="issue-doc-type-error"
                    message={errors.documentType?.message}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="issue-doc-no">เลขที่เอกสาร</Label>
                  <Input
                    id="issue-doc-no"
                    className="font-mono"
                    placeholder="เช่น CCI-26J07-001"
                    aria-invalid={!!errors.documentNo}
                    aria-describedby="issue-doc-no-error"
                    {...register("documentNo")}
                  />
                  <FieldError
                    id="issue-doc-no-error"
                    message={errors.documentNo?.message}
                  />
                </div>
              </div>
            </section>

            <hr className="border-border" />

            <section aria-labelledby="issue-detail-heading" className="flex flex-col gap-4">
              <h3
                id="issue-detail-heading"
                className="text-xs font-semibold uppercase tracking-wide text-fg-secondary"
              >
                รายละเอียดปัญหา
              </h3>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="issue-title">หัวข้อปัญหา</Label>
                <Input
                  id="issue-title"
                  placeholder="สรุปปัญหาสั้นๆ เช่น จำนวนไม่ตรงกับใบเบิก"
                  aria-invalid={!!errors.title}
                  aria-describedby="issue-title-error"
                  {...register("title")}
                />
                <FieldError id="issue-title-error" message={errors.title?.message} />
              </div>

              <div className="flex flex-col gap-1.5">
                <span id="issue-severity-label" className="text-sm font-medium text-fg">
                  ความรุนแรง
                </span>
                <Controller
                  control={control}
                  name="severity"
                  render={({ field }) => (
                    <div
                      role="radiogroup"
                      aria-labelledby="issue-severity-label"
                      className="grid grid-cols-3 gap-2"
                    >
                      {SEVERITY_CHOICES.map((choice) => {
                        const selected = field.value === choice.value;
                        return (
                          <button
                            key={choice.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => field.onChange(choice.value)}
                            className={cn(
                              "flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              selected
                                ? choice.active
                                : "border-border bg-surface hover:bg-surface-2",
                            )}
                          >
                            <span className="flex items-center gap-2 text-sm font-medium text-fg">
                              <span
                                className={cn("size-2 rounded-full", choice.dot)}
                                aria-hidden="true"
                              />
                              {choice.label}
                            </span>
                            <span className="text-xs text-fg-secondary">{choice.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="issue-description">รายละเอียด (ไม่บังคับ)</Label>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      description.length > DESCRIPTION_MAX ? "text-danger" : "text-fg-muted",
                    )}
                  >
                    {description.length.toLocaleString("th-TH")}/
                    {DESCRIPTION_MAX.toLocaleString("th-TH")}
                  </span>
                </div>
                <Textarea
                  id="issue-description"
                  rows={4}
                  placeholder="เกิดอะไรขึ้น พบเมื่อไร และคาดว่าควรเป็นอย่างไร"
                  aria-invalid={!!errors.description}
                  aria-describedby="issue-description-error"
                  {...register("description")}
                />
                <FieldError
                  id="issue-description-error"
                  message={errors.description?.message}
                />
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "แจ้งปัญหา"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
