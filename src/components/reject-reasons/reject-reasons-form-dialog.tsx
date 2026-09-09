"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createRejectReasonAction, updateRejectReasonAction } from "@/app/(dashboard)/master-data/reject-reasons/actions";
import type { RejectReason } from "@/lib/api/reject-reasons";

// Create/edit dialog for a single Reject Reason. Mirrors the same RHF +
// zod + react-hook-form pattern every other CRUD dialog in this app uses
// (see material-pc-form-dialog.tsx for the full rationale on `mode: "onChange"`
// and the open-reset effect). Reject reasons has only 4 fields
// (code, nameTh, nameEn, description) — byte-for-byte the same shape as
// the parallel `loading-points-form-dialog.tsx` /
// `delivery-types-form-dialog.tsx` and Categories' form minus the
// categories-specific fields (sortOrder, iconColor).

const schema = z.object({
  code: z
    .string()
    .min(1, "กรุณากรอกรหัส")
    .max(50, "รหัสต้องไม่เกิน 50 ตัวอักษร"),
  nameTh: z
    .string()
    .min(1, "กรุณากรอกชื่อภาษาไทย")
    .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
  nameEn: z
    .string()
    .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร")
    .optional(),
  description: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function toDefaultValues(rejectReason?: RejectReason | null): FormInput {
  return {
    code: rejectReason?.code ?? "",
    nameTh: rejectReason?.nameTh ?? "",
    nameEn: rejectReason?.nameEn ?? "",
    description: rejectReason?.description ?? "",
  };
}

export function RejectReasonsFormDialog({
  open,
  onOpenChange,
  rejectReason,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectReason?: RejectReason | null;
  onSaved: () => void;
}) {
  const isEdit = !!rejectReason;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(rejectReason),
    // Validate on every change so an error shown after a failed submit
    // clears the instant a field becomes valid — consistent with every
    // other form dialog in this app (see AGENTS.md § Materials PC).
    mode: "onChange",
  });

  React.useEffect(() => {
    if (open) {
      reset(toDefaultValues(rejectReason));
    }
  }, [open, rejectReason, reset]);

  async function onSubmit(input: FormInput) {
    const values: FormValues = schema.parse(input);
    const payload = {
      code: values.code.trim(),
      nameTh: values.nameTh.trim(),
      nameEn: values.nameEn?.trim() ? values.nameEn.trim() : null,
      description: values.description?.trim() ? values.description.trim() : null,
    };

    const result = isEdit
      ? await updateRejectReasonAction(rejectReason!.id, {
          ...payload,
          updatedAt: rejectReason!.updatedAt,
        })
      : await createRejectReasonAction(payload);

    if (result.status === "success") {
      toast.success(isEdit ? "อัปเดตเหตุผลการปฏิเสธแล้ว" : "สร้างเหตุผลการปฏิเสธแล้ว", {
        description: `บันทึก ${result.rejectReason.nameTh} เรียบร้อยแล้ว`,
      });
      onOpenChange(false);
      onSaved();
      return;
    }
    toast.error(result.message);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="lg" className="p-0">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? "แก้ไขเหตุผลการปฏิเสธ" : "เพิ่มเหตุผลการปฏิเสธ"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "แก้ไขข้อมูลเหตุผลการปฏิเสธนี้" : "เพิ่มเหตุผลการปฏิเสธใหม่เข้าสู่ระบบ"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="code">
                  รหัส <span className="text-danger">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="RR-OUT-OF-SPEC"
                  aria-invalid={errors.code ? true : undefined}
                  aria-describedby={errors.code ? "code-error" : undefined}
                  {...register("code")}
                />
                {errors.code && (
                  <p id="code-error" className="text-xs text-danger" role="alert">
                    {errors.code.message}
                  </p>
                )}
                <p className="text-xs text-fg-muted">ระบบจะปรับเป็นตัวพิมพ์ใหญ่ให้อัตโนมัติ</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nameTh">
                  ชื่อ (ไทย) <span className="text-danger">*</span>
                </Label>
                <Input
                  id="nameTh"
                  placeholder="คุณสมบัติไม่ตรงตามสเปก"
                  aria-invalid={errors.nameTh ? true : undefined}
                  aria-describedby={errors.nameTh ? "nameTh-error" : undefined}
                  {...register("nameTh")}
                />
                {errors.nameTh && (
                  <p id="nameTh-error" className="text-xs text-danger" role="alert">
                    {errors.nameTh.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nameEn">ชื่อ (อังกฤษ)</Label>
                <Input
                  id="nameEn"
                  placeholder="Out of Specification"
                  aria-invalid={errors.nameEn ? true : undefined}
                  aria-describedby={errors.nameEn ? "nameEn-error" : undefined}
                  {...register("nameEn")}
                />
                {errors.nameEn && (
                  <p id="nameEn-error" className="text-xs text-danger" role="alert">
                    {errors.nameEn.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="description">คำอธิบาย</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับเหตุผลการปฏิเสธนี้"
                  {...register("description")}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างเหตุผลการปฏิเสธ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
