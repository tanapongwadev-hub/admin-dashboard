"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User, CreditCard, LifeBuoy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { logoutAction } from "@/app/(dashboard)/actions";
import type { AuthenticatedUser, CurrentDepartmentRole } from "@/lib/api/auth";

function displayName(user: AuthenticatedUser) {
  return user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.username;
}

function roleLabel(user: AuthenticatedUser, currentDepartmentRole: CurrentDepartmentRole | null) {
  if (currentDepartmentRole) return currentDepartmentRole.roleName;
  if (user.isSuperAdmin) return "Super Admin";
  return user.roles[0]?.name ?? "—";
}

export function UserMenu({
  user,
  currentDepartmentRole,
}: {
  user: AuthenticatedUser;
  currentDepartmentRole: CurrentDepartmentRole | null;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const name = displayName(user);
  const role = roleLabel(user, currentDepartmentRole);
  const contact = user.email || user.username;

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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="text-sm font-medium text-fg">{name}</span>
          <span className="text-xs font-normal text-fg-muted">{contact}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings"><User className="h-4 w-4" /> Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings?tab=billing"><CreditCard className="h-4 w-4" /> Billing</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings"><Settings className="h-4 w-4" /> Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LifeBuoy className="h-4 w-4" /> Support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive disabled={loggingOut} onSelect={handleLogout}>
          <LogOut className="h-4 w-4" /> {loggingOut ? "Signing out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
