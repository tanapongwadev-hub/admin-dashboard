"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
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
import type { UserListItem } from "@/lib/api/users";
import { resetUserPasswordAction } from "@/app/(dashboard)/system/users/actions";

const schema = z
  .object({
    newPassword: z.string().min(6, "รหัสผ่านอย่างน้อย 6 ตัวอักษร"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "รหัสผ่านไม่ตรงกัน",
  });

type FormValues = z.infer<typeof schema>;

/** Remounted per target by the parent (`key`), so the fields always start empty. */
export function UserPasswordDialog({
  user,
  onOpenChange,
}: {
  user: UserListItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onChange",
  });

  async function onSubmit(values: FormValues) {
    if (!user) return;
    const result = await resetUserPasswordAction(user.id, values.newPassword);
    if (result.status === "error") {
      toast.error("รีเซ็ตรหัสผ่านไม่สำเร็จ", { description: result.message });
      return;
    }
    toast.success("รีเซ็ตรหัสผ่านแล้ว", {
      description: `${user.username} ต้องเข้าสู่ระบบใหม่ด้วยรหัสผ่านนี้`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={user !== null} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary">
              <KeyRound className="size-4" />
            </div>
            <DialogTitle>รีเซ็ตรหัสผ่าน</DialogTitle>
            <DialogDescription>
              ตั้งรหัสผ่านใหม่ให้ {user?.username} แล้วแจ้งเจ้าของบัญชี เซสชันที่เข้าสู่ระบบค้างอยู่จะถูกออกจากระบบ
            </DialogDescription>
          </DialogHeader>
          <fieldset disabled={isSubmitting} className="flex flex-col gap-4 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-new-password">รหัสผ่านใหม่</Label>
              <Input
                id="reset-new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.newPassword}
                aria-describedby={errors.newPassword ? "reset-new-password-error" : undefined}
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p id="reset-new-password-error" role="alert" className="text-xs text-danger">
                  {errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-confirm-password">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "reset-confirm-password-error" : undefined}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p id="reset-confirm-password-error" role="alert" className="text-xs text-danger">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              รีเซ็ตรหัสผ่าน
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
