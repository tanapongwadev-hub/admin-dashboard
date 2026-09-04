import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">การตั้งค่า</h1>
        <p className="mt-1 text-sm text-fg-muted">จัดการโปรไฟล์ ค่ากำหนดพื้นที่ทำงาน และการเรียกเก็บเงินของคุณ</p>
      </div>
      <Suspense fallback={null}>
        <SettingsTabs />
      </Suspense>
    </div>
  );
}
