"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  createMenuAction,
  updateMenuAction,
  type MenuMutationResult,
} from "@/app/(dashboard)/menus/actions";
import { MAX_FLAT_DEPTH, type FlatMenuNode } from "@/lib/menu-tree";
import type { MenuNodeType } from "@/lib/api/menus";

const ROOT_VALUE = "__root__";

const schema = z.object({
  code: z.string().trim().min(1, "กรุณากรอกรหัสเมนู").max(50, "รหัสต้องไม่เกิน 50 ตัวอักษร"),
  nameTh: z.string().trim().min(1, "กรุณากรอกชื่อภาษาไทย").max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
  nameEn: z.string().trim().min(1, "กรุณากรอกชื่อภาษาอังกฤษ").max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
  path: z.string().trim().max(255, "พาธต้องไม่เกิน 255 ตัวอักษร"),
  icon: z.string().trim().max(50, "ชื่อไอคอนต้องไม่เกิน 50 ตัวอักษร"),
  parentId: z.string(),
  menuType: z.enum(["MAIN", "SUB", "BUTTON"]),
  isVisible: z.boolean(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function defaults(menu?: FlatMenuNode | null): FormValues {
  return {
    code: menu?.code ?? "",
    nameTh: menu?.nameTh ?? "",
    nameEn: menu?.nameEn ?? "",
    path: menu?.path ?? "",
    icon: menu?.icon ?? "",
    parentId: menu?.parentId ?? ROOT_VALUE,
    menuType: menu?.menuType ?? "MAIN",
    isVisible: menu?.isVisible ?? true,
    isActive: menu?.isActive ?? true,
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="text-xs text-danger">{message}</p>;
}

export function MenuFormDialog({
  open,
  onOpenChange,
  menu,
  items,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu?: FlatMenuNode | null;
  items: FlatMenuNode[];
  onSaved: (result: Extract<MenuMutationResult, { status: "success" }>) => void;
}) {
  const isEdit = Boolean(menu);
  const hasChildren = menu ? items.some((item) => item.parentId === menu.id) : false;
  const eligibleParents = items.filter(
    (item) => item.depth < MAX_FLAT_DEPTH && item.menuType !== "BUTTON"
  );
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(menu),
    mode: "onChange",
  });

  React.useEffect(() => {
    if (open) reset(defaults(menu));
  }, [menu, open, reset]);

  const selectedParentId = watch("parentId");

  async function onSubmit(values: FormValues) {
    if (hasChildren && values.menuType === "BUTTON") {
      toast.error("เมนูที่มีเมนูย่อยไม่สามารถเปลี่ยนเป็นชนิดปุ่มได้");
      return;
    }

    const common = {
      code: values.code.toUpperCase(),
      nameTh: values.nameTh,
      nameEn: values.nameEn,
      path: values.path,
      icon: values.icon,
      menuType: values.menuType as MenuNodeType,
    };

    const result = isEdit
      ? await updateMenuAction(menu!.id, {
          ...common,
          isVisible: values.isVisible,
          isActive: values.isActive,
        })
      : await createMenuAction({
          ...common,
          menuType: values.parentId === ROOT_VALUE ? values.menuType : "SUB",
          parentId: values.parentId === ROOT_VALUE ? undefined : values.parentId,
          sortOrder: items.filter(
            (item) => item.parentId === (values.parentId === ROOT_VALUE ? null : values.parentId)
          ).length,
        });

    if (result.status === "success") {
      toast.success(isEdit ? "อัปเดตเมนูแล้ว" : "สร้างเมนูแล้ว", {
        description: `${values.nameTh} พร้อมใช้งานในโครงสร้างเมนู`,
      });
      onSaved(result);
      onOpenChange(false);
      return;
    }
    if (result.status === "refresh_required") {
      toast.success(result.message);
      window.location.reload();
      return;
    }
    toast.error(result.message);
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
      <DialogContent fullScreenOnMobile size="lg" className="p-0">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? "แก้ไขเมนู" : "เพิ่มเมนู"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "ปรับชื่อ เส้นทาง ไอคอน และสถานะ โดยไม่เปลี่ยนตำแหน่งใน tree"
                : "สร้างจุดนำทางใหม่ แล้วเลือกตำแหน่งเริ่มต้นใน tree"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="menu-code">รหัสเมนู <span className="text-danger">*</span></Label>
                <Input
                  id="menu-code"
                  placeholder="MATERIAL_VIEW"
                  autoComplete="off"
                  aria-invalid={errors.code ? true : undefined}
                  aria-describedby={errors.code ? "menu-code-error" : "menu-code-hint"}
                  {...register("code")}
                />
                <FieldError id="menu-code-error" message={errors.code?.message} />
                {!errors.code && <p id="menu-code-hint" className="text-xs text-fg-muted">ต้องไม่ซ้ำ ระบบจะบันทึกเป็นตัวพิมพ์ใหญ่</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="menu-type">ชนิดเมนู <span className="text-danger">*</span></Label>
                <Controller
                  name="menuType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!isEdit && selectedParentId !== ROOT_VALUE}>
                      <SelectTrigger id="menu-type" aria-describedby="menu-type-hint">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MAIN" disabled={isEdit ? menu!.depth > 0 : selectedParentId !== ROOT_VALUE}>เมนูหลัก</SelectItem>
                        <SelectItem value="SUB" disabled={isEdit ? menu!.depth === 0 : selectedParentId === ROOT_VALUE}>เมนูย่อย</SelectItem>
                        <SelectItem value="BUTTON" disabled={hasChildren}>ปุ่มคำสั่ง</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p id="menu-type-hint" className="text-xs text-fg-muted">เมนูใต้ parent ใหม่จะถูกกำหนดเป็นเมนูย่อยอัตโนมัติ</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="menu-name-th">ชื่อภาษาไทย <span className="text-danger">*</span></Label>
                <Input id="menu-name-th" placeholder="วัตถุดิบ" aria-invalid={errors.nameTh ? true : undefined} aria-describedby={errors.nameTh ? "menu-name-th-error" : undefined} {...register("nameTh")} />
                <FieldError id="menu-name-th-error" message={errors.nameTh?.message} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="menu-name-en">ชื่อภาษาอังกฤษ <span className="text-danger">*</span></Label>
                <Input id="menu-name-en" placeholder="Materials" aria-invalid={errors.nameEn ? true : undefined} aria-describedby={errors.nameEn ? "menu-name-en-error" : undefined} {...register("nameEn")} />
                <FieldError id="menu-name-en-error" message={errors.nameEn?.message} />
              </div>

              {!isEdit && (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="menu-parent">ตำแหน่งเริ่มต้น</Label>
                  <Controller
                    name="parentId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setValue("menuType", value === ROOT_VALUE ? "MAIN" : "SUB", { shouldValidate: true });
                        }}
                      >
                        <SelectTrigger id="menu-parent"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ROOT_VALUE}>ระดับบนสุด</SelectItem>
                          {eligibleParents.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {`${"— ".repeat(item.depth + 1)}${item.nameTh}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-fg-muted">
                    ขั้นตอนนี้สร้างรายการเมนูเท่านั้น ผู้ใช้ทั่วไปจะเห็นเมนูหลังจากได้รับ permission ที่เกี่ยวข้อง
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="menu-path">เส้นทาง</Label>
                <Input id="menu-path" placeholder="/materials" autoComplete="off" aria-invalid={errors.path ? true : undefined} aria-describedby={errors.path ? "menu-path-error" : "menu-path-hint"} {...register("path")} />
                <FieldError id="menu-path-error" message={errors.path?.message} />
                {!errors.path && <p id="menu-path-hint" className="text-xs text-fg-muted">เว้นว่างได้สำหรับเมนูที่ใช้จัดกลุ่ม</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="menu-icon">ชื่อไอคอน</Label>
                <Input id="menu-icon" placeholder="folder-tree" autoComplete="off" aria-invalid={errors.icon ? true : undefined} aria-describedby={errors.icon ? "menu-icon-error" : "menu-icon-hint"} {...register("icon")} />
                <FieldError id="menu-icon-error" message={errors.icon?.message} />
                {!errors.icon && <p id="menu-icon-hint" className="text-xs text-fg-muted">ใช้ชื่อ Lucide แบบ kebab-case</p>}
              </div>

              {isEdit && (
                <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                  <Controller
                    name="isVisible"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 px-4 py-3">
                        <div><p className="text-sm font-medium text-fg">แสดงในแถบเมนู</p><p className="text-xs text-fg-muted">ซ่อนได้โดยไม่ปิดการใช้งาน</p></div>
                        <Switch aria-label="แสดงในแถบเมนู" checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    )}
                  />
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 px-4 py-3">
                        <div><p className="text-sm font-medium text-fg">เปิดใช้งาน</p><p className="text-xs text-fg-muted">ปิดไว้ได้โดยไม่ลบข้อมูล</p></div>
                        <Switch aria-label="เปิดใช้งานเมนู" checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    )}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>ยกเลิก</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างเมนู"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
