import { Info } from "lucide-react";

/** Marks a page whose numbers come from sample data, not cps-api. */
export function SampleDataNotice() {
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning-fg"
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-semibold">ข้อมูลตัวอย่าง</span> — หน้านี้ยังไม่เชื่อมกับข้อมูลจริงของระบบ
        ห้ามใช้ตัวเลขในหน้านี้ตัดสินใจเรื่องสต็อกหรือการผลิต
      </p>
    </div>
  );
}
