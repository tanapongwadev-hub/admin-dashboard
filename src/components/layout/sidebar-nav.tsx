"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMenuIcons, type ResolvedMenuNode } from "@/lib/menu-icons";
import { menuHref } from "@/lib/nav";
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

// Shared row chrome for every nav row (static link, tree link, tree button)
// so the three can't drift. Borderless by design: the old look put a border
// box + a bordered icon tile on every single row, which made a 20-item menu
// read as 20 competing cards. State is carried by a 3px left accent bar +
// subtle bg tint instead of a full primary fill, which was visually loud
// for a 20-item menu and felt out of step with the rest of the design
// system (cards, dialogs, tables all use border + bg-surface-2):
//   active leaf  → bg-primary-soft tint + text-primary + 3px primary accent
//                   bar on the left edge (the one unmistakable row)
//   open parent  → bg-surface-2 fill + full-strength text
//   idle         → transparent + secondary text + bg-surface-2 on hover
const rowBase =
  "group relative flex w-full min-w-0 items-center rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function rowTone(active: boolean, emphasized = false) {
  if (active) return "bg-primary-soft text-primary font-semibold";
  if (emphasized) return "bg-surface-2 text-fg";
  return "text-fg-secondary hover:bg-surface-2 hover:text-fg";
}

function iconTone(active: boolean, emphasized = false) {
  if (active) return "text-primary";
  if (emphasized) return "text-fg";
  return "text-fg-muted group-hover:text-fg-secondary";
}

// 3px left accent bar marks the active row. Same shape for top-level and
// nested — the previous design only added it for nested (so the indent
// guide rail had a clear active node), but the new bg-primary-soft tint
// alone isn't loud enough to be unmistakable, so every active row gets
// the accent bar regardless of depth.
const activeAccentBar =
  "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary";

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

  // Shared inner content of the row, whether it renders as a link or a
  // toggle button. Top level keeps its icon; nested levels drop it (the
  // indent + guide rail already says "child of the row above") and rely on
  // an active accent bar instead of a bullet dot.
  const rowInner = (
    <>
      {topLevel ? (
        <Icon className={cn("size-[18px] shrink-0 transition-colors", iconTone(active, emphasized))} strokeWidth={1.75} />
      ) : null}
      {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{node.name}</span>}
    </>
  );

  const rowClasses = cn(
    "flex min-w-0 flex-1 items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    collapsed ? "h-9 justify-center px-0" : topLevel ? "min-h-9 gap-3 py-1.5 pl-2.5 pr-1" : "min-h-8 gap-2 py-1 pl-2.5 pr-1"
  );

  return (
    <div className="min-w-0">
      <div className={cn(rowBase, rowTone(active, emphasized), !collapsed && "pr-0.5")}>
        {/* 3px accent bar on the left edge — same shape for top-level and
            nested rows. The previous design only added it for nested items
            (to anchor the indent guide rail), but with the new bg-primary-soft
            tint a left bar on every active row is the unmistakable cue. */}
        {active && <span className={activeAccentBar} aria-hidden="true" />}
        {href ? (
          <Link
            href={href}
            onClick={onNavigate}
            aria-label={collapsed ? node.name : undefined}
            title={collapsed ? node.name : undefined}
            className={rowClasses}
          >
            {rowInner}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onToggle(node.id, isOpen)}
            aria-expanded={hasChildren ? isOpen : undefined}
            aria-label={collapsed ? node.name : undefined}
            title={collapsed ? node.name : undefined}
            className={rowClasses}
          >
            {rowInner}
          </button>
        )}
        {hasChildren && !collapsed && (
          <button
            type="button"
            onClick={() => onToggle(node.id, isOpen)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "ยุบ" : "ขยาย"}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active ? "text-primary-fg/80 hover:bg-white/15 hover:text-primary-fg" : "text-fg-muted hover:bg-surface hover:text-fg"
            )}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-90")} />
          </button>
        )}
      </div>
      {hasChildren && !collapsed && isOpen && (
        <div className="relative ml-[1.55rem] mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
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
    <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-2.5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex flex-col gap-0.5">
        {!collapsed && (
          <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-muted">พื้นที่ทำงาน</p>
        )}
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
    </nav>
  );
}
