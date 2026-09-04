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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { AppUser, UserRole, UserStatus } from "@/lib/types";

const schema = z.object({
  name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  email: z.string().email("กรอกอีเมลให้ถูกต้อง"),
  role: z.enum(["Owner", "Admin", "Editor", "Viewer"]),
  status: z.enum(["Active", "Invited", "Suspended"]),
});

type FormValues = z.infer<typeof schema>;

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AppUser | null;
  onSave: (values: FormValues, existing?: AppUser | null) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", role: "Viewer", status: "Invited" },
  });

  React.useEffect(() => {
    if (open) {
      reset(
        user
          ? { name: user.name, email: user.email, role: user.role, status: user.status }
          : { name: "", email: "", role: "Viewer", status: "Invited" }
      );
    }
  }, [open, user, reset]);

  function onSubmit(values: FormValues) {
    onSave(values, user);
    toast.success(user ? "อัปเดตผู้ใช้แล้ว" : "เชิญผู้ใช้แล้ว", {
      description: user ? `บันทึกรายละเอียดของ ${values.name} แล้ว` : `ส่งคำเชิญไปยัง ${values.email} แล้ว`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{user ? "แก้ไขผู้ใช้" : "เชิญผู้ใช้"}</DialogTitle>
            <DialogDescription>
              {user ? "อัปเดตบทบาทและรายละเอียดของสมาชิก" : "ส่งคำเชิญเพื่อเพิ่มสมาชิกใหม่ในทีม"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">ชื่อ-นามสกุล</Label>
              <Input id="name" placeholder="Jordan Blake" {...register("name")} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">ที่อยู่อีเมล</Label>
              <Input id="email" type="email" placeholder="jordan@company.com" {...register("email")} />
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>บทบาท</Label>
                <Select value={watch("role")} onValueChange={(v) => setValue("role", v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Owner", "Admin", "Editor", "Viewer"] as UserRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>สถานะ</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as UserStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Active", "Invited", "Suspended"] as UserStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {user ? "บันทึกการเปลี่ยนแปลง" : "ส่งคำเชิญ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
