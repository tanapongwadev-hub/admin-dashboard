import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Building2, ChevronRight, Info, KeyRound, LayoutGrid, Mail, ShieldCheck, UserRound } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { getCurrentSession } from "@/lib/session";
import { flattenMenus, menuHref } from "@/lib/nav";
import { resolveMenuIcons } from "@/lib/menu-icons";

export const metadata: Metadata = { title: "การตั้งค่าบัญชี" };

function InfoTile({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-fg-muted">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-fg">{value}</p>
      </div>
    </div>
  );
}

// Read-only account page: there is no self-service API in cps-api yet, so
// nothing here pretends to save. Account changes go through an admin.
export default async function SettingsPage() {
  const session = await getCurrentSession();
  const user = session?.user;
  const role = session?.currentDepartmentRole;
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "—";

  const menus = session?.menus ?? [];
  const resolved = resolveMenuIcons(menus).filter((menu) => menu.path !== "/menu-hub");
  const pageCount = flattenMenus(menus).filter((menu) => menu.path && menu.menuType !== "BUTTON").length;

  const roleName = role?.roleName ?? (user?.isSuperAdmin ? "ผู้ดูแลระบบสูงสุด" : "—");
  const departmentName = role?.departmentName ?? (user?.isSuperAdmin ? "ทุกแผนก (ไม่จำกัด)" : "—");
  const parentName = role?.departmentParentName ?? null;
  const departmentPath = role?.departmentNameEn ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">การตั้งค่าบัญชี</h1>
        <p className="mt-1 text-sm text-fg-secondary">ข้อมูลบัญชีและสิทธิ์การเข้าถึงของคุณ</p>
      </div>

      <section className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <UserAvatar name={fullName} className="size-20 text-2xl ring-4 ring-white/15" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-semibold">{fullName}</h2>
              {user?.isSuperAdmin && <Badge variant="primary">Super Admin</Badge>}
            </div>
            <p className="mt-1 text-sm text-white/70">@{user?.username ?? "—"}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">{roleName}</span>
              {parentName && <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">กลุ่ม: {parentName}</span>}
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">{parentName ? `แผนกย่อย: ${departmentName}` : departmentName}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">เข้าถึงได้ {pageCount} หน้า</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="ข้อมูลบัญชี" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoTile Icon={UserRound} label="ชื่อผู้ใช้" value={user?.username ?? "—"} />
        <InfoTile Icon={Mail} label="อีเมล" value={user?.email ?? "—"} />
        <InfoTile Icon={ShieldCheck} label="บทบาท" value={roleName} />
        <InfoTile
          Icon={Building2}
          label={parentName ? "กลุ่ม › แผนกย่อย" : "แผนก"}
          value={parentName ? `${parentName} › ${departmentName}${departmentPath ? ` (${departmentPath})` : ""}` : departmentName}
        />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-fg-muted" aria-hidden="true" />
            <h2 className="text-base font-semibold text-fg">เมนูที่คุณเข้าถึงได้</h2>
          </div>
          <Link href="/menu-hub" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <LayoutGrid className="size-4" aria-hidden="true" />
            ดูทั้งหมดในรวมเมนู
          </Link>
        </div>
        {resolved.length === 0 ? (
          <p className="mt-4 text-sm text-fg-muted">ยังไม่มีเมนูที่เข้าถึงได้</p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {resolved.map((menu) => (
              <li key={menu.id}>
                <Link
                  href={menuHref(menu.path ?? menu.children.find((child) => child.path)?.path ?? null)}
                  className="group flex items-center gap-3 rounded-lg bg-surface-2/60 px-3 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:bg-primary-soft hover:text-primary"
                >
                  <menu.Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{menu.name}</span>
                  <ChevronRight className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-primary-soft p-4 text-sm text-fg">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p>
          ต้องการเปลี่ยนรหัสผ่าน แก้ไขข้อมูลส่วนตัว หรือขอสิทธิ์เพิ่ม กรุณาติดต่อผู้ดูแลระบบ
          ระบบยังไม่รองรับการแก้ไขด้วยตนเอง
        </p>
      </div>
    </div>
  );
}
