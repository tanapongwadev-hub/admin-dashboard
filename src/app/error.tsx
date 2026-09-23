"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <section className="max-w-md space-y-4 text-center" role="alert" aria-live="assertive">
        <h1 className="text-2xl font-semibold text-foreground">ไม่สามารถแสดงหน้านี้ได้</h1>
        <p className="text-sm text-muted-foreground">
          เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
        </p>
        <Button type="button" onClick={retry}>ลองอีกครั้ง</Button>
      </section>
    </main>
  );
}
