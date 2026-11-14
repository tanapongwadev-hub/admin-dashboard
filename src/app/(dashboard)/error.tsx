"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";

// Segment boundary: keeps the dashboard shell (sidebar/topbar) when a page fails.
export default function DashboardError({
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
    <section className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center" role="alert">
      <PageTitle className="text-fg">ไม่สามารถแสดงหน้านี้ได้</PageTitle>
      <p className="text-sm text-fg-muted">เกิดข้อผิดพลาดที่ไม่คาดคิด เมนูด้านข้างยังใช้งานได้ กรุณาลองใหม่อีกครั้งหรือเลือกหน้าอื่น</p>
      <Button type="button" onClick={() => retry()}>ลองอีกครั้ง</Button>
    </section>
  );
}
