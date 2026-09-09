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
import { createLoadingPointAction, updateLoadingPointAction } from "@/app/(dashboard)/master-data/loading-points/actions";
import type { LoadingPoint } from "@/lib/api/loading-points";

// Create/edit dialog for a single Loading Point. Mirrors the same RHF +
// zod + react-hook-form pattern every other CRUD dialog in this app uses
// (see material-pc-form-dialog.tsx for the full rationale on `mode: "onChange"`
// and the open-reset effect). Loading points has only 4 fields
// (code, nameTh, nameEn, description) so this dialog is intentionally
// lighter than Materials PC's — no FK selects, no image upload, no
// numeric fields, no iconColor preview. Same shape as the parallel
// `categories-form-dialog.tsx` minus the categories-specific fields
// (sortOrder, iconColor).

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

function toDefaultValues(loadingPoint?: LoadingPoint | null): FormInput {
  return {
    code: loadingPoint?.code ?? "",
    nameTh: loadingPoint?.nameTh ?? "",
    nameEn: loadingPoint?.nameEn ?? "",
    description: loadingPoint?.description ?? "",
  };
}

export function LoadingPointsFormDialog({
  open,
  onOpenChange,
  loadingPoint,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadingPoint?: LoadingPoint | null;
  onSaved: () => void;
}) {
  const isEdit = !!loadingPoint;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(loadingPoint),
    // Validate on every change so an error shown after a failed submit
    // clears the instant a field becomes valid — consistent with every
    // other form dialog in this app (see AGENTS.md § Materials PC).
    mode: "onChange",
  });

  React.useEffect(() => {
    if (open) {
      reset(toDefaultValues(loadingPoint));
    }
  }, [open, loadingPoint, reset]);

  async function onSubmit(input: FormInput) {
    const values: FormValues = schema.parse(input);
    const payload = {
      code: values.code.trim(),
      nameTh: values.nameTh.trim(),
      nameEn: values.nameEn?.trim() ? values.nameEn.trim() : null,
      description: values.description?.trim() ? values.description.trim() : null,
    };

    const result = isEdit
      ? await updateLoadingPointAction(loadingPoint!.id, {
          ...payload,
          updatedAt: loadingPoint!.updatedAt,
        })
      : await createLoadingPointAction(payload);

    if (result.status === "success") {
      toast.success(isEdit ? "อัปเดตจุดขนถ่ายแล้ว" : "สร้างจุดขนถ่ายแล้ว", {
        description: `บันทึก ${result.loadingPoint.nameTh} เรียบร้อยแล้ว`,
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
            <DialogTitle>{isEdit ? "แก้ไขจุดขนถ่าย" : "เพิ่มจุดขนถ่าย"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "แก้ไขข้อมูลจุดขนถ่ายนี้" : "เพิ่มจุดขนถ่ายใหม่เข้าสู่ระบบ"}
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
                  placeholder="LP-A1"
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
                  placeholder="จุดขนถ่าย A1"
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
                  placeholder="Loading Point A1"
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
                  placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับจุดขนถ่ายนี้"
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
              {isSubmitting ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างจุดขนถ่าย"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
