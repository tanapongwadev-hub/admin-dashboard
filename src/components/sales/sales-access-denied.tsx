import { ShieldAlert } from "lucide-react";

export function SalesAccessDenied({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
      <ShieldAlert className="size-8 text-fg-muted" />
      <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึง{title}</p>
      <p className="max-w-sm text-sm text-fg-muted">กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์</p>
    </div>
  );
}
