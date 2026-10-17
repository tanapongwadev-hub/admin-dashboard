"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LogOut, Repeat, User } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { logoutAction, switchDepartmentAction } from "@/app/(dashboard)/actions";
import type { AuthenticatedUser, CurrentDepartmentRole, MyDepartment } from "@/lib/api/auth";

function displayName(user: AuthenticatedUser) {
  return user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.username;
}

function roleLabel(user: AuthenticatedUser, currentDepartmentRole: CurrentDepartmentRole | null) {
  if (currentDepartmentRole) return currentDepartmentRole.roleName;
  if (user.isSuperAdmin) return "ผู้ดูแลระบบสูงสุด";
  return user.roles[0]?.name ?? "—";
}

function departmentLabel(department: MyDepartment) {
  const name = department.departmentNameEn ?? department.departmentName ?? department.departmentCode;
  return name ?? "ทุกแผนก";
}

export function UserMenu({
  user,
  currentDepartmentRole,
  departments = [],
}: {
  user: AuthenticatedUser;
  currentDepartmentRole: CurrentDepartmentRole | null;
  departments?: MyDepartment[];
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [switchingId, setSwitchingId] = React.useState<string | null>(null);
  const name = displayName(user);
  const role = roleLabel(user, currentDepartmentRole);
  const contact = user.email || user.username;

  // Several assignments: switch between them without signing out. The API
  // issues tokens for the chosen assignment; refreshing re-renders the shell
  // (menus, permissions, department badge) for that department.
  async function handleSwitch(department: MyDepartment) {
    if (department.isCurrent || switchingId) return;
    setSwitchingId(department.userDepartmentRoleId);
    const result = await switchDepartmentAction(department.userDepartmentRoleId);
    setSwitchingId(null);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(`สลับเป็น ${departmentLabel(department)} แล้ว`);
    // Stay on the current page (path + query): the refresh re-renders it for the
    // new department. A page the new department cannot open shows its own notice.
    router.refresh();
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logoutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-surface-2">
          <UserAvatar name={name} color="chart-1" className="h-8 w-8" />
          <div className="hidden text-left leading-tight sm:block">
            <p className="text-[13px] font-medium text-fg">{name}</p>
            <p className="text-[11px] text-fg-muted">{role}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="text-sm font-medium text-fg">{name}</span>
          <span className="text-xs font-normal text-fg-muted">{contact}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {departments.length > 1 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
              <Repeat className="h-3 w-3" aria-hidden="true" /> สลับแผนก
            </DropdownMenuLabel>
            {departments.map((department) => (
              <DropdownMenuItem
                key={department.userDepartmentRoleId}
                disabled={switchingId !== null}
                onSelect={(event) => {
                  event.preventDefault();
                  void handleSwitch(department);
                }}
                className="items-start"
              >
                <Check className={`mt-0.5 h-4 w-4 shrink-0 ${department.isCurrent ? "text-primary" : "opacity-0"}`} aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-fg">{departmentLabel(department)}</span>
                  <span className="text-xs text-fg-muted">{department.roleName}{switchingId === department.userDepartmentRoleId ? " · กำลังสลับ…" : ""}</span>
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link href="/system/settings"><User className="h-4 w-4" /> บัญชีของฉัน</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive disabled={loggingOut} onSelect={handleLogout}>
          <LogOut className="h-4 w-4" /> {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
