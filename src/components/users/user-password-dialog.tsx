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
import type { UserRow } from "@/lib/api/users";
import { resetPasswordAction } from "@/app/(dashboard)/system/users/actions";
import { userDisplayName } from "./user-row-actions";

const schema = z
  .object({
    password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "รหัสผ่านไม่ตรงกัน" });

type Values = z.infer<typeof schema>;

export function UserPasswordDialog({
  user,
  onOpenChange,
}: {
  user: UserRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
    mode: "onChange",
  });

  async function onSubmit(values: Values) {
    if (!user) return;
    const result = await resetPasswordAction(user.id, values.password);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(`ตั้งรหัสผ่านใหม่ให้ ${userDisplayName(user)} แล้ว`);
    onOpenChange(false);
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>ตั้งรหัสผ่านใหม่</DialogTitle>
            <DialogDescription>
              {user ? `${userDisplayName(user)} (${user.username})` : ""} จะถูกออกจากระบบทุกอุปกรณ์ และต้องเข้าสู่ระบบด้วยรหัสผ่านใหม่
            </DialogDescription>
          </DialogHeader>
          <fieldset disabled={isSubmitting} className="flex flex-col gap-4 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-password">รหัสผ่านใหม่</Label>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "reset-password-error" : undefined}
                {...register("password")}
              />
              {errors.password && (
                <p id="reset-password-error" role="alert" className="text-xs text-danger">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-password-confirm">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirm}
                aria-describedby={errors.confirm ? "reset-password-confirm-error" : undefined}
                {...register("confirm")}
              />
              {errors.confirm && (
                <p id="reset-password-confirm-error" role="alert" className="text-xs text-danger">
                  {errors.confirm.message}
                </p>
              )}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "กำลังบันทึก…" : "ตั้งรหัสผ่านใหม่"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
