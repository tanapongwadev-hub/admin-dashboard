import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";

export const metadata: Metadata = { title: "ลืมรหัสผ่าน" };

// cps-api has no self-service password reset endpoint. The previous page
// faked "we sent you a reset link" with a timer; it now states the real
// process instead of pretending an email was sent.
export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <KeyRound className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <h1 className="text-2xl font-semibold text-fg">ลืมรหัสผ่านใช่ไหม?</h1>
        <p className="mt-1.5 text-sm text-fg-secondary">
          ระบบ CPS ยังไม่รองรับการรีเซ็ตรหัสผ่านด้วยตนเอง กรุณาติดต่อผู้ดูแลระบบหรือหัวหน้างานของคุณ
          เพื่อขอตั้งรหัสผ่านใหม่ โดยแจ้งชื่อผู้ใช้ของคุณ
        </p>
      </div>
      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-fg hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> กลับไปหน้าเข้าสู่ระบบ
      </Link>
    </div>
  );
}
