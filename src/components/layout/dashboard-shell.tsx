"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AuthenticatedUser, CurrentDepartmentRole, MenuNode } from "@/lib/api/auth";

export function DashboardShell({
  user,
  currentDepartmentRole,
  menus,
  children,
}: {
  user: AuthenticatedUser;
  currentDepartmentRole: CurrentDepartmentRole | null;
  menus: MenuNode[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-dvh gap-2 overflow-hidden bg-bg p-2 sm:gap-3 sm:p-3 lg:gap-4 lg:p-4">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} menus={menus} />
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3 lg:gap-4">
          <Topbar user={user} currentDepartmentRole={currentDepartmentRole} menus={menus} />
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain rounded-xl border border-border bg-surface [scrollbar-gutter:stable]">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
