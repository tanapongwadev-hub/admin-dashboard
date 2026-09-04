"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const checks = [
    { label: "อย่างน้อย 8 ตัวอักษร", valid: password.length >= 8 },
    { label: "มีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว", valid: /[A-Z]/.test(password) },
    { label: "มีตัวเลขอย่างน้อย 1 ตัว", valid: /[0-9]/.test(password) },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("สร้างบัญชีสำเร็จ");
      router.push("/dashboard");
    }, 700);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">สร้างบัญชีของคุณ</h1>
        <p className="mt-1.5 text-sm text-fg-muted">เริ่มทดลองใช้งานฟรี 14 วัน ไม่ต้องใช้บัตรเครดิต</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">ชื่อ</Label>
            <Input id="firstName" placeholder="Jordan" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">นามสกุล</Label>
            <Input id="lastName" placeholder="Blake" required />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">อีเมลที่ทำงาน</Label>
          <Input id="email" type="email" placeholder="you@company.com" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">รหัสผ่าน</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="ตั้งรหัสผ่าน"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1 flex flex-col gap-1">
            {checks.map((c) => (
              <div key={c.label} className={cn("flex items-center gap-1.5 text-xs", c.valid ? "text-success" : "text-fg-muted")}>
                <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full", c.valid ? "bg-success text-white" : "bg-surface-2")}>
                  {c.valid && <Check className="h-2.5 w-2.5" />}
                </span>
                {c.label}
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="mt-1" disabled={loading}>
          {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
        </Button>

        <p className="text-center text-xs text-fg-muted">
          การดำเนินการต่อถือว่าคุณยอมรับ{" "}
          <Link href="#" className="text-primary hover:underline">เงื่อนไขการให้บริการ</Link> และ{" "}
          <Link href="#" className="text-primary hover:underline">นโยบายความเป็นส่วนตัว</Link> ของ Panel
        </p>
      </form>

      <p className="text-center text-sm text-fg-muted">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
