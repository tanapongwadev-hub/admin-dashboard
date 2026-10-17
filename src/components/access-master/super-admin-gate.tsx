import { ShieldAlert } from "lucide-react";

// Every cps-api /departments, /roles and /sessions route is SUPER_ADMIN only
// (RolesGuard); mirror that instead of letting the page hit a 403.
export function SuperAdminGate({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
      <ShieldAlert className="size-8 text-fg-muted" aria-hidden="true" />
      <p className="text-lg font-semibold text-fg">ต้องใช้สิทธิ์ Super Admin</p>
      <p className="max-w-sm text-sm text-fg-muted">{what}มีผลกับสิทธิ์ของทุกคน จึงเปิดใช้งานได้เฉพาะบัญชี Super Admin เท่านั้น</p>
    </div>
  );
}

export function AccessPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-fg">{title}</h1>
      <p className="mt-1 text-sm text-fg-muted">{description}</p>
    </div>
  );
}
