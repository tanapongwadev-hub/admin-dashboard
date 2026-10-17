"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Department } from "@/lib/api/access-master";
import {
  createDepartmentAction,
  deleteDepartmentAction,
  updateDepartmentAction,
} from "@/app/(dashboard)/system/access-actions";

const NO_PARENT = "__none__";

const schema = z.object({
  code: z.string().trim().min(1, "กรุณากรอกรหัส").max(20, "รหัสต้องไม่เกิน 20 ตัวอักษร"),
  nameTh: z.string().trim().min(1, "กรุณากรอกชื่อไทย").max(100),
  nameEn: z.string().trim().min(1, "กรุณากรอกชื่ออังกฤษ").max(100),
  description: z.string().trim().max(500),
  parentId: z.string(),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

function DepartmentFormDialog({
  department,
  groups,
  onClose,
}: {
  department: Department | null;
  groups: Department[];
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = department !== null;
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      code: department?.code ?? "",
      nameTh: department?.nameTh ?? "",
      nameEn: department?.nameEn ?? "",
      description: department?.description ?? "",
      parentId: department?.parentId ?? NO_PARENT,
      isActive: department?.isActive ?? true,
    },
  });

  async function onSubmit(values: Values) {
    const parentId = values.parentId === NO_PARENT ? null : values.parentId;
    const base = {
      nameTh: values.nameTh,
      nameEn: values.nameEn,
      description: values.description || undefined,
      parentId,
    };
    const result = isEdit
      ? await updateDepartmentAction(department.id, { ...base, isActive: values.isActive })
      : await createDepartmentAction({ ...base, code: values.code, parentId: parentId ?? undefined });
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(isEdit ? "บันทึกแผนกแล้ว" : "สร้างแผนกแล้ว");
    onClose();
    router.refresh();
  }

  const parentOptions = groups.filter((group) => !group.parentId && group.id !== department?.id);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent fullScreenOnMobile size="lg">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? "แก้ไขแผนก" : "เพิ่มแผนก"}</DialogTitle>
            <DialogDescription>แผนกแบบสองระดับ: กลุ่ม (เช่น materials) และแผนกย่อยที่อยู่ใต้กลุ่ม แผนกย่อยได้สิทธิ์ตามกลุ่มอัตโนมัติ</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-1.5">
              <Label htmlFor="dept-code">รหัส *</Label>
              <Input id="dept-code" disabled={isEdit} {...register("code")} aria-invalid={!!errors.code} />
              {isEdit ? <p className="text-xs text-fg-muted">รหัสแผนกแก้ไขไม่ได้</p> : errors.code && <p className="text-xs text-danger" role="alert">{errors.code.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dept-name-th">ชื่อ (ไทย) *</Label>
                <Input id="dept-name-th" {...register("nameTh")} aria-invalid={!!errors.nameTh} />
                {errors.nameTh && <p className="text-xs text-danger" role="alert">{errors.nameTh.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dept-name-en">ชื่อ (อังกฤษ) *</Label>
                <Input id="dept-name-en" {...register("nameEn")} aria-invalid={!!errors.nameEn} placeholder="เช่น materials.pc" />
                {errors.nameEn && <p className="text-xs text-danger" role="alert">{errors.nameEn.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-parent">กลุ่มแม่</Label>
              <Controller
                control={control}
                name="parentId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="dept-parent"><SelectValue placeholder="เลือกกลุ่มแม่" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PARENT}>ไม่มี (เป็นกลุ่มระดับบนสุด)</SelectItem>
                      {parentOptions.map((group) => (
                        <SelectItem key={group.id} value={group.id} textValue={`${group.nameEn} ${group.nameTh}`}>
                          {group.nameEn} · {group.nameTh}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-fg-muted">เลือกกลุ่มเพื่อให้เป็นแผนกย่อย แผนกที่มีแผนกย่อยอยู่แล้วย้ายไปอยู่ใต้กลุ่มอื่นไม่ได้</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-desc">คำอธิบาย</Label>
              <Textarea id="dept-desc" rows={3} {...register("description")} />
            </div>
            {isEdit && (
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <span>
                      <span className="font-medium text-fg">เปิดใช้งาน</span>
                      <span className="block text-xs text-fg-muted">แผนกที่ปิดใช้งานจะไม่ให้สิทธิ์แก่ผู้ใช้ในแผนกนั้น</span>
                    </span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </label>
                )}
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก…" : "บันทึก"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DepartmentClient({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState<Department | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Department | null>(null);
  const [busy, setBusy] = React.useState(false);

  const byId = React.useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const groups = departments.filter((d) => !d.parentId);
  // Groups first, each followed by its sub-departments.
  const rows = React.useMemo(
    () =>
      groups
        .sort((a, b) => a.nameEn.localeCompare(b.nameEn))
        .flatMap((group) => [
          group,
          ...departments.filter((d) => d.parentId === group.id).sort((a, b) => a.nameEn.localeCompare(b.nameEn)),
        ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departments],
  );

  async function toggleActive(department: Department) {
    const result = await updateDepartmentAction(department.id, {
      nameTh: department.nameTh,
      nameEn: department.nameEn,
      isActive: !department.isActive,
    });
    if (result.status === "error") toast.error(result.message);
    else {
      toast.success(department.isActive ? "ปิดใช้งานแผนกแล้ว" : "เปิดใช้งานแผนกแล้ว");
      router.refresh();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const result = await deleteDepartmentAction(deleteTarget.id);
    setBusy(false);
    if (result.status === "error") toast.error(result.message);
    else {
      toast.success("ลบแผนกแล้ว");
      router.refresh();
    }
    setDeleteTarget(null);
  }

  function actionsFor(department: Department): RowAction[] {
    return [
      { label: "แก้ไข", icon: Pencil, onSelect: () => setForm(department) },
      { label: department.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน", icon: Power, onSelect: () => void toggleActive(department), variant: department.isActive ? "danger" : "default" },
      { label: "ลบถาวร", icon: Trash2, onSelect: () => setDeleteTarget(department), variant: "danger" },
    ];
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setForm(null)}><Plus className="mr-1.5 size-4" aria-hidden />เพิ่มแผนก</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>กลุ่ม</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-12"><span className="sr-only">การจัดการ</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-fg-muted">ยังไม่มีแผนก</TableCell></TableRow>
            )}
            {rows.map((department) => {
              const parent = department.parentId ? byId.get(department.parentId) : null;
              return (
                <TableRow key={department.id}>
                  <TableCell className="font-mono text-sm font-medium text-fg">
                    <span className={parent ? "ml-5 inline-flex items-center gap-1 before:text-fg-muted before:content-['└']" : ""}>{department.code}</span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-fg">{department.nameTh}</p>
                    <p className="text-xs text-fg-muted">{department.nameEn}</p>
                  </TableCell>
                  <TableCell className="text-fg-secondary">{parent ? `${parent.nameEn} · ${parent.nameTh}` : <Badge variant="info">กลุ่ม</Badge>}</TableCell>
                  <TableCell><Badge variant={department.isActive ? "success" : "neutral"} dot>{department.isActive ? "ใช้งาน" : "ปิดใช้งาน"}</Badge></TableCell>
                  <TableCell><RowActionsMenu itemLabel={department.nameTh} actions={actionsFor(department)} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {form !== undefined && (
        <DepartmentFormDialog key={form?.id ?? "new"} department={form} groups={departments} onClose={() => setForm(undefined)} />
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open && !busy) setDeleteTarget(null); }}
        title={`ลบแผนก ${deleteTarget?.code ?? ""} ถาวร?`}
        description="ลบได้เฉพาะแผนกที่ไม่มีผู้ใช้และไม่มีแผนกย่อย การตั้งค่าสิทธิ์ของแผนกนี้จะถูกลบด้วย กู้คืนไม่ได้ ถ้าไม่แน่ใจให้ปิดใช้งานแทน"
        confirmLabel="ลบถาวร"
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
