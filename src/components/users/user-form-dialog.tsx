"use client";

import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoleSummary } from "@/lib/api/permission-access";
import type { DepartmentOption, UserAssignmentInput, UserListItem } from "@/lib/api/users";
import { createUserAction, updateUserAction } from "@/app/(dashboard)/system/users/actions";
import { userDisplayName } from "./users-table";

const assignmentSchema = z.object({
  id: z.string().optional(),
  roleId: z.string().min(1, "เลือก role"),
  departmentId: z.string(),
});

function buildSchema(isEdit: boolean, roles: RoleSummary[]) {
  const roleById = new Map(roles.map((role) => [role.id, role]));
  return z
    .object({
      username: z.string().trim(),
      password: z.string(),
      confirmPassword: z.string(),
      firstName: z.string().trim().min(1, "กรอกชื่อ"),
      lastName: z.string().trim().min(1, "กรอกนามสกุล"),
      email: z
        .string()
        .trim()
        .refine((value) => value === "" || z.string().email().safeParse(value).success, "กรอกอีเมลให้ถูกต้อง"),
      telephone: z.string().trim(),
      assignments: z.array(assignmentSchema).min(1, "ต้องมีแผนกและ role อย่างน้อย 1 รายการ"),
    })
    .superRefine((values, ctx) => {
      if (!isEdit) {
        if (!/^[A-Za-z0-9._-]{3,50}$/.test(values.username)) {
          ctx.addIssue({
            code: "custom",
            path: ["username"],
            message: "ใช้ตัวอักษรอังกฤษ ตัวเลข . _ - ได้ 3–50 ตัว",
          });
        }
        if (values.password.length < 6) {
          ctx.addIssue({ code: "custom", path: ["password"], message: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" });
        }
        if (values.confirmPassword !== values.password) {
          ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "รหัสผ่านไม่ตรงกัน" });
        }
      }
      const seen = new Set<string>();
      values.assignments.forEach((assignment, index) => {
        const role = roleById.get(assignment.roleId);
        if (role && role.scopeType !== "SYSTEM" && !assignment.departmentId) {
          ctx.addIssue({
            code: "custom",
            path: ["assignments", index, "departmentId"],
            message: "role นี้ต้องเลือกแผนก",
          });
        }
        const key = `${role?.scopeType === "SYSTEM" ? "" : assignment.departmentId}:${assignment.roleId}`;
        if (assignment.roleId && seen.has(key)) {
          ctx.addIssue({
            code: "custom",
            path: ["assignments", index, "roleId"],
            message: "แผนกและ role นี้ซ้ำกับรายการอื่น",
          });
        }
        seen.add(key);
      });
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function defaultValues(user: UserListItem | null): FormValues {
  return {
    username: user?.username ?? "",
    password: "",
    confirmPassword: "",
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    telephone: user?.telephone ?? "",
    assignments: user?.assignments.length
      ? user.assignments.map((assignment) => ({
          id: assignment.id,
          roleId: assignment.roleId,
          departmentId: assignment.departmentId ?? "",
        }))
      : [{ roleId: "", departmentId: "" }],
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-danger">
      {message}
    </p>
  );
}

/**
 * Create or edit a user. Mounted fresh per open session by the parent (`key`),
 * so default values come from the initializer instead of a reset effect.
 * Edit sends profile + the whole assignment set in one PATCH; existing rows
 * keep their `id` so their per-person overrides survive.
 */
export function UserFormDialog({
  open,
  onOpenChange,
  user,
  roles,
  departments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem | null;
  roles: RoleSummary[];
  departments: DepartmentOption[];
  onSaved: () => void;
}) {
  const isEdit = user !== null;
  const activeRoles = roles.filter(
    (role) => role.isActive || user?.assignments.some((item) => item.roleId === role.id),
  );
  const activeDepartments = departments.filter(
    (department) =>
      department.isActive || user?.assignments.some((item) => item.departmentId === department.id),
  );
  const schema = React.useMemo(() => buildSchema(isEdit, roles), [isEdit, roles]);
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(user),
    mode: "onChange",
  });
  const { fields, append, remove } = useFieldArray({ control, name: "assignments" });
  const assignments = watch("assignments");
  const roleById = new Map(roles.map((role) => [role.id, role]));

  async function onSubmit(values: FormValues) {
    const payloadAssignments: UserAssignmentInput[] = values.assignments.map((assignment) => {
      const isSystem = roleById.get(assignment.roleId)?.scopeType === "SYSTEM";
      return {
        ...(assignment.id ? { id: assignment.id } : {}),
        roleId: assignment.roleId,
        departmentId: isSystem ? null : assignment.departmentId,
      };
    });

    const result = isEdit
      ? await updateUserAction(user.id, {
          firstName: values.firstName,
          lastName: values.lastName,
          // null clears the field; IsEmail rejects an empty string.
          email: values.email || null,
          telephone: values.telephone || null,
          assignments: payloadAssignments,
        })
      : await createUserAction({
          username: values.username,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          ...(values.email ? { email: values.email } : {}),
          ...(values.telephone ? { telephone: values.telephone } : {}),
          assignments: payloadAssignments.map(({ departmentId, roleId }) => ({ departmentId, roleId })),
        });

    if (result.status === "error") {
      toast.error(isEdit ? "บันทึกไม่สำเร็จ" : "สร้างผู้ใช้ไม่สำเร็จ", { description: result.message });
      return;
    }
    toast.success(isEdit ? "บันทึกข้อมูลผู้ใช้แล้ว" : "สร้างผู้ใช้แล้ว", {
      description: userDisplayName(result.user),
    });
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent fullScreenOnMobile size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{isEdit ? `แก้ไขผู้ใช้ ${user.username}` : "เพิ่มผู้ใช้"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "แก้ข้อมูลติดต่อ แผนกและ role การเปลี่ยนแผนกหรือ role ทำให้ผู้ใช้ต้องเข้าสู่ระบบใหม่"
                : "สร้างบัญชีพร้อมมอบหมายแผนกและ role แผนกกำหนดว่าเห็นเมนูไหน role กำหนดว่าทำอะไรได้"}
            </DialogDescription>
          </DialogHeader>

          <fieldset
            disabled={isSubmitting}
            className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="user-username">ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ)</Label>
                <Input
                  id="user-username"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  readOnly={isEdit}
                  className={isEdit ? "bg-surface-2 font-mono" : "font-mono"}
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? "user-username-error" : "user-username-hint"}
                  {...register("username")}
                />
                {errors.username ? (
                  <FieldError id="user-username-error" message={errors.username.message} />
                ) : (
                  <p id="user-username-hint" className="text-xs text-fg-muted">
                    {isEdit ? "เปลี่ยนชื่อผู้ใช้ไม่ได้" : "ระบบเก็บเป็นตัวพิมพ์เล็ก"}
                  </p>
                )}
              </div>
              {!isEdit && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="user-password">รหัสผ่าน</Label>
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
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="user-confirm-password">ยืนยันรหัสผ่าน</Label>
                    <Input
                      id="user-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={!!errors.confirmPassword}
                      aria-describedby={errors.confirmPassword ? "user-confirm-password-error" : undefined}
                      {...register("confirmPassword")}
                    />
                    <FieldError id="user-confirm-password-error" message={errors.confirmPassword?.message} />
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
                <Label htmlFor="user-email">อีเมล (ไม่บังคับ)</Label>
                <Input
                  id="user-email"
                  type="email"
                  autoComplete="off"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "user-email-error" : undefined}
                  {...register("email")}
                />
                <FieldError id="user-email-error" message={errors.email?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-telephone">เบอร์โทร (ไม่บังคับ)</Label>
                <Input id="user-telephone" type="tel" autoComplete="off" {...register("telephone")} />
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-lg border border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
                <div>
                  <h3 className="text-sm font-semibold text-fg">แผนกและ role</h3>
                  <p className="text-xs text-fg-muted">role ระบบ (เช่น Super Admin) ไม่ผูกกับแผนก</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ roleId: "", departmentId: "" })}
                >
                  <Plus className="size-4" />
                  เพิ่ม
                </Button>
              </div>
              <ul className="flex flex-col gap-3 px-4 pb-4">
                {fields.map((field, index) => {
                  const current = assignments[index];
                  const role = current ? roleById.get(current.roleId) : undefined;
                  const isSystem = role?.scopeType === "SYSTEM";
                  const rowErrors = errors.assignments?.[index];
                  return (
                    <li key={field.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`assignment-role-${index}`}>Role</Label>
                        <Select
                          value={current?.roleId ?? ""}
                          onValueChange={(value) => {
                            setValue(`assignments.${index}.roleId`, value, { shouldValidate: true });
                            if (roleById.get(value)?.scopeType === "SYSTEM") {
                              setValue(`assignments.${index}.departmentId`, "", { shouldValidate: true });
                            }
                          }}
                        >
                          <SelectTrigger
                            id={`assignment-role-${index}`}
                            aria-invalid={!!rowErrors?.roleId}
                            aria-describedby={rowErrors?.roleId ? `assignment-role-${index}-error` : undefined}
                          >
                            <SelectValue placeholder="เลือก role" />
                          </SelectTrigger>
                          <SelectContent searchPlaceholder="ค้นหา role...">
                            {activeRoles.map((item) => (
                              <SelectItem key={item.id} value={item.id} textValue={`${item.nameTh} ${item.code}`}>
                                {item.nameTh || item.code}
                                <span className="ml-1.5 font-mono text-xs text-fg-muted">{item.code}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError id={`assignment-role-${index}-error`} message={rowErrors?.roleId?.message} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`assignment-department-${index}`}>แผนก</Label>
                        <Select
                          value={isSystem ? "" : (current?.departmentId ?? "")}
                          disabled={isSystem}
                          onValueChange={(value) =>
                            setValue(`assignments.${index}.departmentId`, value, { shouldValidate: true })
                          }
                        >
                          <SelectTrigger
                            id={`assignment-department-${index}`}
                            aria-invalid={!!rowErrors?.departmentId}
                            aria-describedby={
                              rowErrors?.departmentId ? `assignment-department-${index}-error` : undefined
                            }
                          >
                            <SelectValue placeholder={isSystem ? "ไม่ผูกแผนก (role ระบบ)" : "เลือกแผนก"} />
                          </SelectTrigger>
                          <SelectContent searchPlaceholder="ค้นหาแผนก...">
                            {activeDepartments.map((department) => (
                              <SelectItem
                                key={department.id}
                                value={department.id}
                                textValue={`${department.code} ${department.nameTh}`}
                              >
                                <span className="font-mono text-xs">{department.code}</span>
                                <span className="ml-1.5">{department.nameTh}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError
                          id={`assignment-department-${index}-error`}
                          message={rowErrors?.departmentId?.message}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="sm:mt-6"
                        disabled={fields.length === 1}
                        aria-label={`ลบแผนกและ role แถวที่ ${index + 1}`}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
              {errors.assignments?.root?.message && (
                <p role="alert" className="px-4 pb-3 text-xs text-danger">
                  {errors.assignments.root.message}
                </p>
              )}
            </section>
          </fieldset>

          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "บันทึก" : "สร้างผู้ใช้"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
