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
import { createUnitAction, updateUnitAction } from "@/app/(dashboard)/master-data/units/actions";
import type { Unit } from "@/lib/api/units";

// Create/edit dialog for a single Unit. Shape B+ — same as Material Models
// (code, nameTh, nameEn, description) plus the `symbol` field (e.g. "ชิ้น",
// "กิโลกรัม"). Mirrors the same RHF + zod + react-hook-form pattern every
// other CRUD dialog in this app uses.

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
  symbol: z
    .string()
    .min(1, "กรุณากรอกสัญลักษณ์")
    .max(20, "สัญลักษณ์ต้องไม่เกิน 20 ตัวอักษร"),
  description: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function toDefaultValues(unit?: Unit | null): FormInput {
  return {
    code: unit?.code ?? "",
    nameTh: unit?.nameTh ?? "",
    nameEn: unit?.nameEn ?? "",
    symbol: unit?.symbol ?? "",
    description: unit?.description ?? "",
  };
}

export function UnitsFormDialog({
  open,
  onOpenChange,
  unit,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit?: Unit | null;
  onSaved: () => void;
}) {
  const isEdit = !!unit;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(unit),
    // Validate on every change so an error shown after a failed submit
    // clears the instant a field becomes valid.
    mode: "onChange",
  });

  React.useEffect(() => {
    if (open) {
      reset(toDefaultValues(unit));
    }
  }, [open, unit, reset]);

  async function onSubmit(input: FormInput) {
    const values: FormValues = schema.parse(input);
    const payload = {
      code: values.code.trim(),
      nameTh: values.nameTh.trim(),
      nameEn: values.nameEn?.trim() ? values.nameEn.trim() : null,
      symbol: values.symbol.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
    };

    const result = isEdit
      ? await updateUnitAction(unit!.id, {
          ...payload,
          updatedAt: unit!.updatedAt,
        })
      : await createUnitAction(payload);

    if (result.status === "success") {
      toast.success(isEdit ? "อัปเดตหน่วยนับแล้ว" : "สร้างหน่วยนับแล้ว", {
        description: `บันทึก ${result.unit.nameTh} เรียบร้อยแล้ว`,
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
            <DialogTitle>{isEdit ? "แก้ไขหน่วยนับ" : "เพิ่มหน่วยนับ"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "แก้ไขข้อมูลหน่วยนับนี้" : "เพิ่มหน่วยนับใหม่เข้าสู่ระบบ"}
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
                  placeholder="UNIT-A"
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
                  placeholder="หน่วยนับตัวอย่าง"
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
                  placeholder="Example Unit"
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="symbol">
                  สัญลักษณ์ <span className="text-danger">*</span>
                </Label>
                <Input
                  id="symbol"
                  placeholder="EG"
                  aria-invalid={errors.symbol ? true : undefined}
                  aria-describedby={errors.symbol ? "symbol-error" : undefined}
                  {...register("symbol")}
                />
                {errors.symbol && (
                  <p id="symbol-error" className="text-xs text-danger" role="alert">
                    {errors.symbol.message}
                  </p>
                )}
                <p className="text-xs text-fg-muted">เช่น ชิ้น, กิโลกรัม, ลิตร</p>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="description">คำอธิบาย</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับหน่วยนับนี้"
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
              {isSubmitting ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างหน่วยนับ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
