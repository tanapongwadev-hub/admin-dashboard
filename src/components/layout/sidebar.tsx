"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(dashboard)/actions";
import type { AuthenticatedUser, CurrentDepartmentRole, MenuNode } from "@/lib/api/auth";

function displayName(user: AuthenticatedUser) {
  return user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.username;
}

function roleLabel(_user: AuthenticatedUser, currentDepartmentRole: CurrentDepartmentRole | null) {
  if (currentDepartmentRole) return currentDepartmentRole.roleName;
  return "ผู้ดูแลระบบ";
}

// Bottom-of-sidebar user block — avatar + name + role + a sign-out
// affordance. The collapse/expand toggle is NOT here — it lives in the
// topbar (where the mobile Sheet trigger also lives, as a sibling at the
// same horizontal slot) so a user can always see + reach the sidebar toggle
// from the topbar, and the bottom of the sidebar is reserved for the
// identity block alone. Reuses the same `logoutAction` that the topbar's
// `UserMenu` uses; on click, we sign out, route to /login, and refresh
// so every Server Component in the tree re-runs `getCurrentSession()` (which
// now returns null because the cookies are gone — see the auto-logout-on-
// 401 entry in AGENTS.md Recent Changes). The topbar's `UserMenu` is kept
// for the mobile Sheet (where this block is hidden by `hidden lg:flex`).
function SidebarUserProfile({
  user,
  currentDepartmentRole,
  collapsed,
}: {
  user: AuthenticatedUser;
  currentDepartmentRole: CurrentDepartmentRole | null;
  collapsed: boolean;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await logoutAction();
    router.push("/login");
    router.refresh();
  }

  const name = displayName(user);
  const role = roleLabel(user, currentDepartmentRole);
  const tooltipLabel = `${name} · ${role}`;

  // Collapsed: avatar as the visual anchor + sign-out icon below.
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-border p-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="rounded-lg p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <UserAvatar name={name} color="chart-1" className="h-9 w-9" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">{tooltipLabel}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="ออกจากระบบ"
              className="h-8 w-8 text-fg-muted hover:text-fg"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">ออกจากระบบ</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Expanded: avatar + name + role + sign-out (no collapse button — that
  // lives in the topbar now).
  return (
    <div className="border-t border-border">
      <div className="flex items-center gap-3 px-3 py-3">
        <UserAvatar name={name} color="chart-1" className="h-9 w-9 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-[13px] font-semibold text-fg" title={name}>
            {name}
          </p>
          <p className="truncate text-[11px] text-fg-muted" title={role}>
            {role}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="ออกจากระบบ"
              className="h-8 w-8 shrink-0 text-fg-muted hover:text-fg"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">ออกจากระบบ</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function Sidebar({
  collapsed,
  user,
  currentDepartmentRole,
  menus,
}: {
  collapsed: boolean;
  // No onToggle / onToggleCollapsed — the collapse button moved to the
  // topbar (see the Topbar changes in this same change). The Sidebar no
  // longer needs to know how to collapse itself.
  user: AuthenticatedUser;
  currentDepartmentRole: CurrentDepartmentRole | null;
  menus: MenuNode[];
}) {
  return (
    <aside
      className={cn(
        // "on-navy" makes every token-driven class below (bg-surface,
        // border-border, text-fg, bg-primary-soft, ...) resolve against the
        // fixed dark-navy palette instead of the light one used everywhere
        // else — see globals.css. The sidebar's own color never changes; it
        // isn't part of any light/dark toggle (there isn't one anymore).
        "on-navy hidden shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-[width] duration-200 lg:flex",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Logo collapsed={collapsed} />
      </div>
      <SidebarNav collapsed={collapsed} menus={menus} />
      <SidebarUserProfile
        user={user}
        currentDepartmentRole={currentDepartmentRole}
        collapsed={collapsed}
      />
    </aside>
  );
}
