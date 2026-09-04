"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 700);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
          <MailCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-fg">ตรวจสอบอีเมลของคุณ</h1>
          <p className="mt-1.5 text-sm text-fg-muted">
            เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ <span className="font-medium text-fg">{email}</span> แล้ว
          </p>
        </div>
        <Button variant="outline" className="mt-2 w-full" onClick={() => setSent(false)}>
          ลองใช้อีเมลอื่น
        </Button>
        <Link href="/login" className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">ลืมรหัสผ่านใช่ไหม?</h1>
        <p className="mt-1.5 text-sm text-fg-muted">กรอกอีเมลของคุณ แล้วเราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">อีเมล</Label>
          <Input id="email" type="email" placeholder="you@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "กำลังส่งลิงก์..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
        </Button>
      </form>

      <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-fg-secondary hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> กลับไปหน้าเข้าสู่ระบบ
      </Link>
    </div>
  );
}
