"use client";

import { ChevronsLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { MenuNode } from "@/lib/api/auth";

export function Sidebar({
  collapsed,
  onToggle,
  menus,
}: {
  collapsed: boolean;
  onToggle: () => void;
  menus: MenuNode[];
}) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-[width] duration-200 lg:flex",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Logo collapsed={collapsed} />
      </div>
      <SidebarNav collapsed={collapsed} menus={menus} />
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex min-h-10 w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-sm text-fg-secondary transition-colors hover:border-border hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            collapsed && "justify-center px-2"
          )}
        >
          <ChevronsLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
