"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound, Pencil, Plus, Power, Trash2 } from "lucide-react";
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
import type { RoleSummary } from "@/lib/api/permission-access";
import { createRoleAction, deleteRoleAction, updateRoleAction } from "@/app/(dashboard)/system/access-actions";

const SCOPE_LABEL = { SYSTEM: "ทั้งระบบ (SYSTEM)", DEPARTMENT: "ตามแผนก (DEPARTMENT)" } as const;

const schema = z.object({
  code: z.string().trim().min(1, "กรุณากรอกรหัส").max(50, "รหัสต้องไม่เกิน 50 ตัวอักษร"),
  nameTh: z.string().trim().min(1, "กรุณากรอกชื่อไทย").max(100),
  nameEn: z.string().trim().min(1, "กรุณากรอกชื่ออังกฤษ").max(100),
  scopeType: z.enum(["SYSTEM", "DEPARTMENT"]),
  description: z.string().trim().max(500),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

function RoleFormDialog({ role, onClose }: { role: RoleSummary | null; onClose: () => void }) {
  const router = useRouter();
  const isEdit = role !== null;
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      code: role?.code ?? "",
      nameTh: role?.nameTh ?? "",
      nameEn: role?.nameEn ?? "",
      scopeType: role?.scopeType ?? "DEPARTMENT",
      description: role?.description ?? "",
      isActive: role?.isActive ?? true,
    },
  });

  async function onSubmit(values: Values) {
    const base = {
      nameTh: values.nameTh,
      nameEn: values.nameEn,
      scopeType: values.scopeType,
      description: values.description || undefined,
    };
    const result = isEdit
      ? await updateRoleAction(role.id, { ...base, isActive: values.isActive })
      : await createRoleAction({ ...base, code: values.code.toUpperCase() });
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(isEdit ? "บันทึก role แล้ว" : "สร้าง role แล้ว");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent fullScreenOnMobile size="lg">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? "แก้ไข role" : "เพิ่ม role"}</DialogTitle>
            <DialogDescription>
              role กำหนดว่าทำ action อะไรได้ (ตั้งค่า action ที่แท็บ Role ของหน้าสิทธิ์การเข้าถึง) ส่วนแผนกกำหนดว่าเข้าเมนูไหนได้
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-1.5">
              <Label htmlFor="role-code">รหัส *</Label>
              <Input id="role-code" disabled={isEdit} {...register("code")} aria-invalid={!!errors.code} />
              {isEdit ? <p className="text-xs text-fg-muted">รหัส role แก้ไขไม่ได้</p> : errors.code && <p className="text-xs text-danger" role="alert">{errors.code.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role-name-th">ชื่อ (ไทย) *</Label>
                <Input id="role-name-th" {...register("nameTh")} aria-invalid={!!errors.nameTh} />
                {errors.nameTh && <p className="text-xs text-danger" role="alert">{errors.nameTh.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-name-en">ชื่อ (อังกฤษ) *</Label>
                <Input id="role-name-en" {...register("nameEn")} aria-invalid={!!errors.nameEn} />
                {errors.nameEn && <p className="text-xs text-danger" role="alert">{errors.nameEn.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-scope">ขอบเขต</Label>
              <Controller
                control={control}
                name="scopeType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="role-scope"><SelectValue placeholder="เลือกขอบเขต" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEPARTMENT">{SCOPE_LABEL.DEPARTMENT}</SelectItem>
                      <SelectItem value="SYSTEM">{SCOPE_LABEL.SYSTEM}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-desc">คำอธิบาย</Label>
              <Textarea id="role-desc" rows={3} {...register("description")} />
            </div>
            {isEdit && !role.isSystem && (
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <span>
                      <span className="font-medium text-fg">เปิดใช้งาน</span>
                      <span className="block text-xs text-fg-muted">role ที่ปิดใช้งานจะไม่ให้สิทธิ์แก่ผู้ใช้ที่ถูกมอบหมาย</span>
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

export function RoleClient({ roles }: { roles: RoleSummary[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState<RoleSummary | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<RoleSummary | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function toggleActive(role: RoleSummary) {
    const result = await updateRoleAction(role.id, {
      nameTh: role.nameTh,
      nameEn: role.nameEn,
      scopeType: role.scopeType,
      isActive: !role.isActive,
    });
    if (result.status === "error") toast.error(result.message);
    else {
      toast.success(role.isActive ? "ปิดใช้งาน role แล้ว" : "เปิดใช้งาน role แล้ว");
      router.refresh();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const result = await deleteRoleAction(deleteTarget.id);
    setBusy(false);
    if (result.status === "error") toast.error(result.message);
    else {
      toast.success("ลบ role แล้ว");
      router.refresh();
    }
    setDeleteTarget(null);
  }

  function actionsFor(role: RoleSummary): RowAction[] {
    const actions: RowAction[] = [{ label: "แก้ไข", icon: Pencil, onSelect: () => setForm(role) }];
    if (!role.isSystem) {
      actions.push(
        { label: role.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน", icon: Power, onSelect: () => void toggleActive(role), variant: role.isActive ? "danger" : "default" },
        { label: "ลบถาวร", icon: Trash2, onSelect: () => setDeleteTarget(role), variant: "danger" },
      );
    }
    return actions;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/system/permissions?tab=roles"><KeyRound className="mr-1.5 size-4" aria-hidden />ตั้งค่า action ของ role</Link>
        </Button>
        <Button onClick={() => setForm(null)}><Plus className="mr-1.5 size-4" aria-hidden />เพิ่ม role</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>ขอบเขต</TableHead>
              <TableHead className="text-right">action</TableHead>
              <TableHead className="text-right">ผู้ใช้</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-12"><span className="sr-only">การจัดการ</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-fg-muted">ยังไม่มี role</TableCell></TableRow>
            )}
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-mono text-sm font-medium text-fg">
                  {role.code}
                  {role.isSystem && <Badge variant="info" className="ml-2">ระบบ</Badge>}
                </TableCell>
                <TableCell>
                  <p className="font-medium text-fg">{role.nameTh}</p>
                  <p className="text-xs text-fg-muted">{role.nameEn}</p>
                </TableCell>
                <TableCell className="text-fg-secondary">{SCOPE_LABEL[role.scopeType]}</TableCell>
                <TableCell className="text-right tabular-nums">{role.actionCodes.length}</TableCell>
                <TableCell className="text-right tabular-nums">{role.userCount}</TableCell>
                <TableCell><Badge variant={role.isActive ? "success" : "neutral"} dot>{role.isActive ? "ใช้งาน" : "ปิดใช้งาน"}</Badge></TableCell>
                <TableCell><RowActionsMenu itemLabel={role.nameTh} actions={actionsFor(role)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {form !== undefined && <RoleFormDialog key={form?.id ?? "new"} role={form} onClose={() => setForm(undefined)} />}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open && !busy) setDeleteTarget(null); }}
        title={`ลบ role ${deleteTarget?.code ?? ""} ถาวร?`}
        description="ลบได้เฉพาะ role ที่ไม่มีผู้ใช้ถูกมอบหมาย และไม่ใช่ role ของระบบ action ของ role นี้จะถูกลบด้วย กู้คืนไม่ได้ ถ้าไม่แน่ใจให้ปิดใช้งานแทน"
        confirmLabel="ลบถาวร"
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
