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
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex min-h-10 items-center gap-2.5 rounded-lg border px-2 py-1.5 text-sm font-medium transition-[color,background-color,border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-primary/20 bg-primary-soft text-primary shadow-sm"
          : "border-transparent text-fg-secondary hover:border-border hover:bg-surface-2 hover:text-fg",
        collapsed && "justify-center px-1.5"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
          active
            ? "border-transparent bg-surface text-primary"
            : "border-border bg-surface text-fg-muted group-hover:border-border-strong group-hover:text-fg-secondary"
        )}
      >
        <Icon className="size-4" strokeWidth={2} />
      </span>
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
  const topLevel = depth === 0;
  const emphasized = active || (topLevel && hasChildren && isOpen);

  return (
    <div className="min-w-0">
      <div
        className={cn(
          "group relative flex items-center rounded-lg border text-sm font-medium transition-[color,background-color,border-color,box-shadow]",
          topLevel ? "min-h-10" : "min-h-9",
          active
            ? "border-primary/20 bg-primary-soft text-primary"
            : emphasized
              ? "border-border-strong bg-surface-2 text-fg shadow-sm"
              : "border-transparent text-fg-secondary hover:border-border hover:bg-surface-2 hover:text-fg"
        )}
      >
        {active && !topLevel && <span className="absolute -left-[13px] top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-primary" />}
        {href ? (
          <Link
            href={href}
            onClick={onNavigate}
            aria-label={collapsed ? node.name : undefined}
            title={collapsed ? node.name : undefined}
            className={cn(
              "flex min-w-0 flex-1 items-center py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              topLevel ? "gap-2.5 pl-2 pr-1" : "gap-2 pl-2.5 pr-1",
              collapsed && "justify-center px-1.5"
            )}
          >
            {topLevel ? (
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                  active
                    ? "border-transparent bg-surface text-primary"
                    : emphasized
                      ? "border-transparent bg-primary-soft text-primary"
                    : "border-border bg-surface text-fg-muted group-hover:border-border-strong group-hover:text-fg-secondary"
                )}
              >
                <Icon className="size-4" strokeWidth={2} />
              </span>
            ) : (
              <span className={cn("size-1.5 shrink-0 rounded-full bg-border-strong", active && "bg-primary")} />
            )}
            {!collapsed && <span className="flex-1 truncate">{node.name}</span>}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onToggle(node.id, isOpen)}
            aria-expanded={hasChildren ? isOpen : undefined}
            aria-label={collapsed ? node.name : undefined}
            title={collapsed ? node.name : undefined}
            className={cn(
              "flex min-w-0 flex-1 items-center py-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              topLevel ? "gap-2.5 pl-2 pr-1" : "gap-2 pl-2.5 pr-1",
              collapsed && "justify-center px-1.5"
            )}
          >
            {topLevel ? (
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                  active
                    ? "border-transparent bg-surface text-primary"
                    : emphasized
                      ? "border-transparent bg-primary-soft text-primary"
                    : "border-border bg-surface text-fg-muted group-hover:border-border-strong group-hover:text-fg-secondary"
                )}
              >
                <Icon className="size-4" strokeWidth={2} />
              </span>
            ) : (
              <span className="size-1.5 shrink-0 rounded-full bg-border-strong" />
            )}
            {!collapsed && <span className="flex-1 truncate">{node.name}</span>}
          </button>
        )}
        {hasChildren && !collapsed && (
          <button
            type="button"
            onClick={() => onToggle(node.id, isOpen)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "ยุบ" : "ขยาย"}
            className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />
          </button>
        )}
      </div>
      {hasChildren && !collapsed && isOpen && (
        <div className="relative ml-[1.35rem] mt-1 flex flex-col gap-1 border-l border-border pl-3">
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
    <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex flex-col gap-1">
        {!collapsed && <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">พื้นที่ทำงาน</p>}
        {items.length === 0 && !collapsed && (
          <p className="px-2.5 py-1 text-xs text-fg-muted">ไม่มีรายการเมนูสำหรับสิทธิ์การใช้งานของคุณ</p>
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
        {!collapsed && <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">ทั่วไป</p>}
        {secondaryNav.map((item) => (
          <StaticNavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
