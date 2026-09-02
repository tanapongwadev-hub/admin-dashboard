"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { resolveMenuIcons, type ResolvedMenuNode } from "@/lib/menu-icons";
import { secondaryNav, menuHref, type NavItem } from "@/lib/nav";
import type { MenuNode } from "@/lib/api/auth";

function isActiveHref(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(href + "/");
}

// Ids of every node whose subtree contains the current route — used to
// auto-expand the path to whatever page is active. Pure/derived, computed
// fresh each render rather than stored in state.
function activeChainIds(menus: ResolvedMenuNode[], pathname: string): Set<string> {
  const chain = new Set<string>();
  function walk(nodes: ResolvedMenuNode[]): boolean {
    let hit = false;
    for (const node of nodes) {
      const ownMatch = node.path ? isActiveHref(pathname, menuHref(node.path)) : false;
      const childMatch = walk(node.children);
      if (ownMatch || childMatch) {
        chain.add(node.id);
        hit = true;
      }
    }
    return hit;
  }
  walk(menus);
  return chain;
}

function StaticNavLink({ item, collapsed, onNavigate, pathname }: { item: NavItem; collapsed?: boolean; onNavigate?: () => void; pathname: string }) {
  const active = isActiveHref(pathname, item.href);
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

function MenuTreeItem({
  node,
  depth,
  collapsed,
  pathname,
  autoOpenIds,
  overrides,
  onToggle,
  onNavigate,
}: {
  node: ResolvedMenuNode;
  depth: number;
  collapsed?: boolean;
  pathname: string;
  autoOpenIds: Set<string>;
  overrides: Record<string, boolean>;
  onToggle: (id: string, wasOpen: boolean) => void;
  onNavigate?: () => void;
}) {
  if (node.menuType === "BUTTON") return null;

  const Icon = node.Icon;
  const href = node.path ? menuHref(node.path) : undefined;
  const hasChildren = node.children.length > 0;
  const isOpen = overrides[node.id] ?? autoOpenIds.has(node.id);
  const active = href ? isActiveHref(pathname, href) : false;

  return (
    <div>
      <div
        className={cn(
          "group relative flex items-center rounded-lg text-sm font-medium transition-colors",
          active ? "bg-primary-soft text-primary" : "text-fg-secondary hover:bg-surface-2 hover:text-fg"
        )}
      >
        {href ? (
          <Link
            href={href}
            onClick={onNavigate}
            className="flex flex-1 items-center gap-3 py-2 pl-2.5 pr-1"
            style={depth > 0 && !collapsed ? { paddingLeft: `${10 + depth * 16}px` } : undefined}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            {!collapsed && <span className="flex-1 truncate">{node.name}</span>}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onToggle(node.id, isOpen)}
            className="flex flex-1 items-center gap-3 py-2 pl-2.5 pr-1 text-left"
            style={depth > 0 && !collapsed ? { paddingLeft: `${10 + depth * 16}px` } : undefined}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            {!collapsed && <span className="flex-1 truncate">{node.name}</span>}
          </button>
        )}
        {hasChildren && !collapsed && (
          <button
            type="button"
            onClick={() => onToggle(node.id, isOpen)}
            aria-label={isOpen ? "Collapse" : "Expand"}
            className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />
          </button>
        )}
      </div>
      {hasChildren && !collapsed && isOpen && (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {node.children.map((child) => (
            <MenuTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              pathname={pathname}
              autoOpenIds={autoOpenIds}
              overrides={overrides}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarNav({
  collapsed,
  onNavigate,
  menus,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  menus: MenuNode[];
}) {
  const pathname = usePathname();
  const resolved = React.useMemo(() => resolveMenuIcons(menus), [menus]);
  const autoOpenIds = React.useMemo(() => activeChainIds(resolved, pathname), [resolved, pathname]);
  // Only tracks nodes the user has manually clicked open/closed; auto-expand
  // for the active route is derived fresh each render instead (see
  // autoOpenIds), so this never needs to be synced via an effect.
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>({});

  function toggle(id: string, wasOpen: boolean) {
    setOverrides((prev) => ({ ...prev, [id]: !wasOpen }));
  }

  const items = resolved.filter((m) => m.menuType !== "BUTTON");

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      <div className="flex flex-col gap-1">
        {!collapsed && <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Workspace</p>}
        {items.length === 0 && !collapsed && (
          <p className="px-2.5 py-1 text-xs text-fg-muted">No menu items available for your role.</p>
        )}
        {items.map((item) => (
          <MenuTreeItem
            key={item.id}
            node={item}
            depth={0}
            collapsed={collapsed}
            pathname={pathname}
            autoOpenIds={autoOpenIds}
            overrides={overrides}
            onToggle={toggle}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        {!collapsed && <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">General</p>}
        {secondaryNav.map((item) => (
          <StaticNavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
