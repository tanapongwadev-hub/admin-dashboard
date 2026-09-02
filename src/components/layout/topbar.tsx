"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { secondaryNav, menuHref, flattenMenus } from "@/lib/nav";
import type { AuthenticatedUser, CurrentDepartmentRole, MenuNode } from "@/lib/api/auth";

function useBreadcrumb(menus: MenuNode[]) {
  const pathname = usePathname();
  const all = [
    ...flattenMenus(menus)
      .filter((m) => m.path)
      .map((m) => ({ label: m.name, href: menuHref(m.path) })),
    ...secondaryNav,
  ];
  const match = all.find((item) => (item.href === "/dashboard" ? pathname === "/dashboard" : pathname === item.href || pathname.startsWith(item.href + "/")));
  return match?.label ?? "Overview";
}

export function Topbar({
  user,
  currentDepartmentRole,
  menus,
}: {
  user: AuthenticatedUser;
  currentDepartmentRole: CurrentDepartmentRole | null;
  menus: MenuNode[];
}) {
  const crumb = useBreadcrumb(menus);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <header className="z-30 flex h-16 shrink-0 items-center gap-3 rounded-xl border border-border bg-surface/90 px-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/70 sm:px-5">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-fg-secondary lg:hidden" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col bg-bg p-2 sm:p-3">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
              <Logo />
            </div>
            <SidebarNav menus={menus} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="hidden items-center gap-1.5 text-sm text-fg-muted lg:flex">
        <span>Panel</span>
        <span>/</span>
        <span className="font-medium text-fg">{crumb}</span>
      </div>

      <div className="ml-auto flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <div className="hidden sm:block sm:w-64 md:w-80">
          <CommandPalette />
        </div>
        <Button variant="ghost" size="icon" className="text-fg-secondary sm:hidden" aria-label="Search">
          <CommandPaletteMobileIcon />
        </Button>
        <NotificationsMenu />
        <ThemeToggle />
        <div className="mx-1 h-6 w-px bg-border" />
        <UserMenu user={user} currentDepartmentRole={currentDepartmentRole} />
      </div>
    </header>
  );
}

function CommandPaletteMobileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
