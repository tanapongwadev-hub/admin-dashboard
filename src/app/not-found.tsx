import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Compass className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-1 text-2xl font-semibold text-fg">ไม่พบหน้าที่ค้นหา</h1>
        <p className="mt-2 max-w-sm text-sm text-fg-muted">
          หน้าที่คุณกำลังค้นหาไม่มีอยู่ หรืออาจถูกย้ายไปแล้ว
        </p>
      </div>
      <Button asChild className="mt-2">
        <Link href="/dashboard">กลับไปหน้าแดชบอร์ด</Link>
      </Button>
    </div>
  );
}
