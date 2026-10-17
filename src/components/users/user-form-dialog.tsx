"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { DepartmentOption, UserDetail, UserRow } from "@/lib/api/users";
import type { RoleSummary } from "@/lib/api/permission-access";
import { createUserAction, updateUserAction } from "@/app/(dashboard)/system/users/actions";

const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "กรอกอีเมลให้ถูกต้อง");

const baseSchema = z.object({
  firstName: z.string().trim().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
  email: optionalEmail,
  telephone: z.string().trim(),
});

const createFields = {
  username: z
    .string()
    .trim()
    .min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร")
    .regex(/^[A-Za-z0-9._-]+$/, "ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีด และขีดล่าง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  departmentId: z.string().min(1, "กรุณาเลือกแผนก"),
  roleId: z.string().min(1, "กรุณาเลือก role"),
};

const createSchema = baseSchema.extend(createFields);
// Edit hides the create-only fields, so they are not validated there.
const editSchema = baseSchema.extend({
  username: z.string(),
  password: z.string(),
  departmentId: z.string(),
  roleId: z.string(),
});

type CreateValues = z.infer<typeof createSchema>;

const EMPTY: CreateValues = {
  username: "",
  password: "",
  firstName: "",
  lastName: "",
  email: "",
  telephone: "",
  departmentId: "",
  roleId: "",
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-danger">
      {message}
    </p>
  );
}

/**
 * Create (user + first department/role) or edit (name/contact only). The
 * parent remounts it per open session via `key`, so defaults come straight
 * from props without a reset effect.
 */
export function UserFormDialog({
  open,
  onOpenChange,
  user,
  departments,
  roles,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit. The list row has no telephone, so edit starts it blank. */
  user: UserRow | null;
  departments: DepartmentOption[];
  roles: RoleSummary[];
  onSaved: (user: UserDetail) => void;
}) {
  const isEdit = !!user;
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: user
      ? {
          ...EMPTY,
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          email: user.email ?? "",
        }
      : EMPTY,
    mode: "onChange",
  });

  async function onSubmit(values: CreateValues) {
    const contact = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim() || undefined,
      telephone: values.telephone.trim() || undefined,
    };
    const result = user
      ? await updateUserAction(user.id, contact)
      : await createUserAction({
          ...contact,
          username: values.username.trim(),
          password: values.password,
          assignments: [{ departmentId: values.departmentId, roleId: values.roleId }],
        });
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(user ? "บันทึกข้อมูลผู้ใช้แล้ว" : `สร้างผู้ใช้ ${result.user.username} แล้ว`);
    onSaved(result.user);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="lg" className="p-0">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? "แก้ไขข้อมูลผู้ใช้" : "เพิ่มผู้ใช้"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? `ชื่อผู้ใช้ ${user?.username ?? ""} เปลี่ยนไม่ได้ แผนกและ role แก้ได้จากเมนู "แผนกและ Role"`
                : "ผู้ใช้ต้องอยู่อย่างน้อยหนึ่งแผนก แผนกกำหนดเมนูที่เห็น role กำหนด action ที่ทำได้"}
            </DialogDescription>
          </DialogHeader>

          <fieldset
            disabled={isSubmitting}
            className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5 [scrollbar-width:none] sm:grid-cols-2 [&::-webkit-scrollbar]:hidden"
          >
            {!isEdit && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-username">ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ)</Label>
                  <Input
                    id="user-username"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={!!errors.username}
                    aria-describedby={errors.username ? "user-username-error" : undefined}
                    {...register("username")}
                  />
                  <FieldError id="user-username-error" message={errors.username?.message} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-password">รหัสผ่านเริ่มต้น</Label>
                  <Input
                    id="user-password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "user-password-error" : undefined}
                    {...register("password")}
                  />
                  <FieldError id="user-password-error" message={errors.password?.message} />
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-first-name">ชื่อ</Label>
              <Input
                id="user-first-name"
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? "user-first-name-error" : undefined}
                {...register("firstName")}
              />
              <FieldError id="user-first-name-error" message={errors.firstName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-last-name">นามสกุล</Label>
              <Input
                id="user-last-name"
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? "user-last-name-error" : undefined}
                {...register("lastName")}
              />
              <FieldError id="user-last-name-error" message={errors.lastName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-email">{isEdit ? "อีเมล (เว้นว่าง = คงค่าเดิม)" : "อีเมล (ไม่บังคับ)"}</Label>
              <Input
                id="user-email"
                type="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "user-email-error" : undefined}
                {...register("email")}
              />
              <FieldError id="user-email-error" message={errors.email?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-telephone">{isEdit ? "เบอร์โทร (เว้นว่าง = คงค่าเดิม)" : "เบอร์โทร (ไม่บังคับ)"}</Label>
              <Input id="user-telephone" type="tel" {...register("telephone")} />
            </div>

            {!isEdit && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-department">แผนก</Label>
                  <Controller
                    control={control}
                    name="departmentId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="user-department"
                          aria-invalid={!!errors.departmentId}
                          aria-describedby={errors.departmentId ? "user-department-error" : undefined}
                        >
                          <SelectValue placeholder="เลือกแผนก" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.nameEn} · {department.nameTh}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError id="user-department-error" message={errors.departmentId?.message} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-role">Role</Label>
                  <Controller
                    control={control}
                    name="roleId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="user-role"
                          aria-invalid={!!errors.roleId}
                          aria-describedby={errors.roleId ? "user-role-error" : undefined}
                        >
                          <SelectValue placeholder="เลือก role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.nameTh}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError id="user-role-error" message={errors.roleId?.message} />
                </div>
              </>
            )}
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "สร้างผู้ใช้"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
