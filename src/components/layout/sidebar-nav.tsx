"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { primaryNav, secondaryNav, type NavItem } from "@/lib/nav";
import { Badge } from "@/components/ui/badge";

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary-soft text-primary" : "text-fg-secondary hover:bg-surface-2 hover:text-fg"
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      {!collapsed && (
        <span className="flex flex-1 items-center justify-between">
          {item.label}
          {item.badge && (
            <Badge variant="primary" className="px-1.5 py-0 text-[10px]">
              {item.badge}
            </Badge>
          )}
        </span>
      )}
    </Link>
  );
}

export function SidebarNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      <div className="flex flex-col gap-1">
        {!collapsed && <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Workspace</p>}
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        {!collapsed && <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">General</p>}
        {secondaryNav.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  );
}
