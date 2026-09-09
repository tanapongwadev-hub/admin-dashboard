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
import { createSupplierAction, updateSupplierAction } from "@/app/(dashboard)/master-data/suppliers/actions";
import type { Supplier } from "@/lib/api/suppliers";

// Create/edit dialog for a single Supplier. Mirrors the same RHF + zod +
// react-hook-form pattern every other CRUD dialog in this app uses (see
// material-pc-form-dialog.tsx for the full rationale on `mode: "onChange"`
// and the open-reset effect). Supplier has 9 fields (code, nameTh, nameEn,
// taxId, contactName, telephone, email, address, isActive) — more than
// the parallel simple-master form dialogs, so the form uses a wider
// layout grid and DialogContent size="xl".

const schema = z.object({
  code: z
    .string()
    .min(1, "กรุณากรอกรหัส")
    .max(50, "รหัสต้องไม่เกิน 50 ตัวอักษร"),
  nameTh: z
    .string()
    .min(1, "กรุณากรอกชื่อภาษาไทย")
    .max(255, "ชื่อต้องไม่เกิน 255 ตัวอักษร"),
  nameEn: z
    .string()
    .max(255, "ชื่อต้องไม่เกิน 255 ตัวอักษร")
    .optional(),
  taxId: z
    .string()
    .max(20, "เลขประจำตัวผู้เสียภาษีต้องไม่เกิน 20 ตัวอักษร")
    .optional(),
  contactName: z
    .string()
    .max(255, "ชื่อผู้ติดต่อต้องไม่เกิน 255 ตัวอักษร")
    .optional(),
  telephone: z
    .string()
    .max(50, "เบอร์โทรต้องไม่เกิน 50 ตัวอักษร")
    .optional(),
  email: z
    .string()
    .max(255, "อีเมลต้องไม่เกิน 255 ตัวอักษร")
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "รูปแบบอีเมลไม่ถูกต้อง",
    }),
  address: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function toDefaultValues(supplier?: Supplier | null): FormInput {
  return {
    code: supplier?.code ?? "",
    nameTh: supplier?.nameTh ?? "",
    nameEn: supplier?.nameEn ?? "",
    taxId: supplier?.taxId ?? "",
    contactName: supplier?.contactName ?? "",
    telephone: supplier?.telephone ?? "",
    email: supplier?.email ?? "",
    address: supplier?.address ?? "",
  };
}

export function SuppliersFormDialog({
  open,
  onOpenChange,
  supplier,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSaved: () => void;
}) {
  const isEdit = !!supplier;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(supplier),
    mode: "onChange",
  });

  React.useEffect(() => {
    if (open) {
      reset(toDefaultValues(supplier));
    }
  }, [open, supplier, reset]);

  async function onSubmit(input: FormInput) {
    const values: FormValues = schema.parse(input);
    const payload = {
      code: values.code.trim(),
      nameTh: values.nameTh.trim(),
      nameEn: values.nameEn?.trim() ? values.nameEn.trim() : null,
      taxId: values.taxId?.trim() ? values.taxId.trim() : null,
      contactName: values.contactName?.trim() ? values.contactName.trim() : null,
      telephone: values.telephone?.trim() ? values.telephone.trim() : null,
      email: values.email?.trim() ? values.email.trim() : null,
      address: values.address?.trim() ? values.address.trim() : null,
    };

    const result = isEdit
      ? await updateSupplierAction(supplier!.id, {
          ...payload,
          updatedAt: supplier!.updatedAt,
        })
      : await createSupplierAction(payload);

    if (result.status === "success") {
      toast.success(isEdit ? "อัปเดตผู้จัดจำหน่ายแล้ว" : "สร้างผู้จัดจำหน่ายแล้ว", {
        description: `บันทึก ${result.supplier.nameTh} เรียบร้อยแล้ว`,
      });
      onOpenChange(false);
      onSaved();
      return;
    }
    toast.error(result.message);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="p-0">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? "แก้ไขผู้จัดจำหน่าย" : "เพิ่มผู้จัดจำหน่าย"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "แก้ไขข้อมูลผู้จัดจำหน่ายนี้" : "เพิ่มผู้จัดจำหน่ายใหม่เข้าสู่ระบบ"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* รหัส — full width */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="code">
                  รหัส <span className="text-danger">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="SUP-A"
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

              {/* ชื่อ (ไทย) + ชื่อ (อังกฤษ) */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nameTh">
                  ชื่อ (ไทย) <span className="text-danger">*</span>
                </Label>
                <Input
                  id="nameTh"
                  placeholder="บริษัท ผู้จัดจำหน่าย ตัวอย่าง จำกัด"
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
                  placeholder="Example Supplier Co., Ltd."
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

              {/* เลขประจำตัวผู้เสียภาษี + ผู้ติดต่อ */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="taxId">เลขประจำตัวผู้เสียภาษี (Tax ID)</Label>
                <Input
                  id="taxId"
                  placeholder="0105548012345"
                  maxLength={20}
                  aria-invalid={errors.taxId ? true : undefined}
                  aria-describedby={errors.taxId ? "taxId-error" : undefined}
                  {...register("taxId")}
                />
                {errors.taxId && (
                  <p id="taxId-error" className="text-xs text-danger" role="alert">
                    {errors.taxId.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactName">ชื่อผู้ติดต่อ</Label>
                <Input
                  id="contactName"
                  placeholder="สมชาย จัดการดี"
                  aria-invalid={errors.contactName ? true : undefined}
                  aria-describedby={errors.contactName ? "contactName-error" : undefined}
                  {...register("contactName")}
                />
                {errors.contactName && (
                  <p id="contactName-error" className="text-xs text-danger" role="alert">
                    {errors.contactName.message}
                  </p>
                )}
              </div>

              {/* เบอร์โทร + อีเมล */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="telephone">เบอร์โทรศัพท์</Label>
                <Input
                  id="telephone"
                  placeholder="02-123-4567"
                  maxLength={50}
                  aria-invalid={errors.telephone ? true : undefined}
                  aria-describedby={errors.telephone ? "telephone-error" : undefined}
                  {...register("telephone")}
                />
                {errors.telephone && (
                  <p id="telephone-error" className="text-xs text-danger" role="alert">
                    {errors.telephone.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@supplier.example"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email")}
                />
                {errors.email && (
                  <p id="email-error" className="text-xs text-danger" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* ที่อยู่ — full width */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="address">ที่อยู่</Label>
                <Textarea
                  id="address"
                  rows={3}
                  placeholder="123 ถนนตัวอย่าง แขวงสวนจาง เขตบางกะปิ กรุงเทพฯ 10240"
                  {...register("address")}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างผู้จัดจำหน่าย"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
