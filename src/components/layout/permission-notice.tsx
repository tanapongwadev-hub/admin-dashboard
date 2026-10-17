import Link from "next/link";
import { ArrowLeft, LayoutGrid, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RequiredPermission {
  code: string;
  label: string;
}

// Friendly full-page notice for a page the viewer can open but not use yet.
// Shows exactly which permission is missing so an admin can grant it.
export function PermissionNotice({
  title,
  description,
  required = [],
}: {
  title: string;
  description: string;
  required?: RequiredPermission[];
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <section
        role="alert"
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm"
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-warning-soft text-warning-fg ring-1 ring-warning/20">
          <LockKeyhole className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-fg">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-secondary">{description}</p>

        {required.length > 0 && (
          <div className="mt-6 rounded-xl bg-surface-2 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">สิทธิ์ที่ต้องมี</p>
            <ul className="mt-2 flex flex-col gap-2">
              {required.map((permission) => (
                <li key={permission.code} className="flex flex-wrap items-center justify-between gap-2 text-sm text-fg">
                  <span>{permission.label}</span>
                  <code className="rounded-md bg-surface px-2 py-1 font-mono text-xs text-fg-secondary ring-1 ring-border">
                    {permission.code}
                  </code>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-5 text-xs text-fg-muted">ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ แล้วเข้าสู่ระบบใหม่เพื่อให้สิทธิ์มีผล</p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="outline">
            <Link href="/dashboard"><ArrowLeft className="size-4" aria-hidden="true" />กลับหน้าภาพรวม</Link>
          </Button>
          <Button asChild>
            <Link href="/menu-hub"><LayoutGrid className="size-4" aria-hidden="true" />ไปหน้ารวมเมนู</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
