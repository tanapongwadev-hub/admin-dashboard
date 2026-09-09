"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Palette } from "lucide-react";
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
import { createCategoryAction, updateCategoryAction } from "@/app/(dashboard)/master-data/categories/actions";
import type { Category } from "@/lib/api/categories";
import { cn } from "@/lib/utils";

// Create/edit dialog for a single Category — mirrors the same RHF + zod +
// react-hook-form pattern every other CRUD dialog in this app uses
// (see material-pc-form-dialog.tsx for the full rationale on `mode: "onChange"`
// and the open-reset effect). Categories has a small fixed set of fields
// (code, nameTh, nameEn, sortOrder, iconColor, description) so this dialog
// is intentionally lighter than Materials PC's — no FK selects, no image
// upload, no supplier list to manage.

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

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
  sortOrder: z.coerce
    .number()
    .int("ลำดับต้องเป็นจำนวนเต็ม")
    .min(0, "ลำดับต้องไม่น้อยกว่า 0")
    .max(9999, "ลำดับต้องไม่เกิน 9999"),
  iconColor: z
    .string()
    .max(20, "ค่าสีต้องไม่เกิน 20 ตัวอักษร")
    .refine((v) => v === "" || HEX_COLOR_PATTERN.test(v), {
      message: "รูปแบบสีไม่ถูกต้อง (ใช้ #RGB, #RRGGBB หรือ #RRGGBBAA)",
    })
    .optional(),
  description: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function toDefaultValues(category?: Category | null): FormInput {
  return {
    code: category?.code ?? "",
    nameTh: category?.nameTh ?? "",
    nameEn: category?.nameEn ?? "",
    sortOrder: category?.sortOrder ?? 0,
    iconColor: category?.iconColor ?? "",
    description: category?.description ?? "",
  };
}

// Resolves the color string for the live preview swatch. Anything that
// doesn't match the hex regex renders a neutral placeholder (same as the
// table's `IconColorSwatch` for a missing value) so the swatch never
// silently applies an unparseable value.
function isHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

export function CategoriesFormDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSaved: () => void;
}) {
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(category),
    // Validate on every change so an error shown after a failed submit
    // clears the instant a field becomes valid — consistent with every
    // other form dialog in this app (see AGENTS.md § Materials PC).
    mode: "onChange",
  });

  React.useEffect(() => {
    if (open) {
      reset(toDefaultValues(category));
    }
  }, [open, category, reset]);

  const iconColor = watch("iconColor");

  async function onSubmit(input: FormInput) {
    const values: FormValues = schema.parse(input);
    const payload = {
      code: values.code.trim(),
      nameTh: values.nameTh.trim(),
      nameEn: values.nameEn?.trim() ? values.nameEn.trim() : null,
      // Backend defaults sortOrder to 0 when omitted, so we always send the
      // current value (which is 0 on a brand-new category with the default
      // value) — never `undefined`, which would be dropped by JSON.stringify
      // and lose the explicit "0" semantics.
      sortOrder: values.sortOrder,
      iconColor: values.iconColor?.trim() ? values.iconColor.trim() : null,
      description: values.description?.trim() ? values.description.trim() : null,
    };

    const result = isEdit
      ? await updateCategoryAction(category!.id, {
          ...payload,
          updatedAt: category!.updatedAt,
        })
      : await createCategoryAction(payload);

    if (result.status === "success") {
      toast.success(isEdit ? "อัปเดตหมวดหมู่แล้ว" : "สร้างหมวดหมู่แล้ว", {
        description: `บันทึก ${result.category.nameTh} เรียบร้อยแล้ว`,
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
            <DialogTitle>{isEdit ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "แก้ไขข้อมูลหมวดหมู่นี้" : "เพิ่มหมวดหมู่ใหม่เข้าสู่ระบบ"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">
                  รหัส <span className="text-danger">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="ELECTRONIC"
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
                <Label htmlFor="sortOrder">ลำดับ</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  max="9999"
                  aria-invalid={errors.sortOrder ? true : undefined}
                  aria-describedby={errors.sortOrder ? "sortOrder-error" : undefined}
                  {...register("sortOrder")}
                />
                {errors.sortOrder && (
                  <p id="sortOrder-error" className="text-xs text-danger" role="alert">
                    {errors.sortOrder.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="nameTh">
                  ชื่อ (ไทย) <span className="text-danger">*</span>
                </Label>
                <Input
                  id="nameTh"
                  placeholder="อิเล็กทรอนิกส์"
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

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="nameEn">ชื่อ (อังกฤษ)</Label>
                <Input
                  id="nameEn"
                  placeholder="Electronics"
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
                <Label htmlFor="iconColor">สีไอคอน</Label>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md border border-border",
                      isHexColor(iconColor) ? "" : "bg-surface-2 text-fg-muted"
                    )}
                    style={isHexColor(iconColor) ? { backgroundColor: iconColor } : undefined}
                    aria-hidden="true"
                  >
                    {!isHexColor(iconColor) && <Palette className="size-4" />}
                  </span>
                  <Input
                    id="iconColor"
                    placeholder="#4640DE"
                    aria-invalid={errors.iconColor ? true : undefined}
                    aria-describedby={errors.iconColor ? "iconColor-error" : "iconColor-hint"}
                    {...register("iconColor")}
                  />
                </div>
                {errors.iconColor ? (
                  <p id="iconColor-error" className="text-xs text-danger" role="alert">
                    {errors.iconColor.message}
                  </p>
                ) : (
                  <p id="iconColor-hint" className="text-xs text-fg-muted">
                    รูปแบบ hex เช่น #4640DE · ไม่บังคับ
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="description">คำอธิบาย</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับหมวดหมู่นี้"
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
              {isSubmitting ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างหมวดหมู่"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
