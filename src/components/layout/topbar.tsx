"use client";

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
import { primaryNav, secondaryNav } from "@/lib/nav";
import type { AuthenticatedUser, CurrentDepartmentRole } from "@/lib/api/auth";

function useBreadcrumb() {
  const pathname = usePathname();
  const all = [...primaryNav, ...secondaryNav];
  const match = all.find((item) => (item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)));
  return match?.label ?? "Overview";
}

export function Topbar({
  user,
  currentDepartmentRole,
}: {
  user: AuthenticatedUser;
  currentDepartmentRole: CurrentDepartmentRole | null;
}) {
  const crumb = useBreadcrumb();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/70 sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-fg-secondary lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col">
          <div className="flex h-16 items-center border-b border-border px-4">
            <Logo />
          </div>
          <SidebarNav />
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
