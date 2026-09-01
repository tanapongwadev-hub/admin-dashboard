"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AuthenticatedUser, CurrentDepartmentRole } from "@/lib/api/auth";

export function DashboardShell({
  user,
  currentDepartmentRole,
  children,
}: {
  user: AuthenticatedUser;
  currentDepartmentRole: CurrentDepartmentRole | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-dvh overflow-hidden bg-bg">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={user} currentDepartmentRole={currentDepartmentRole} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
