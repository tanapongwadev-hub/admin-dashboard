import type { LucideIcon } from "lucide-react";
import { Settings } from "lucide-react";
import type { MenuNode } from "./api/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

// Always-visible, account-level items with no cps-api menu equivalent
// (not a business permission — everyone who's logged in can reach their own
// settings). All business/module navigation comes from the real backend
// menu tree (GET /auth/me's accessControl.menus) — see Conventions §
// Sidebar permissions in AGENTS.md and ADR-004.
export const secondaryNav: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

// cps-api menu paths are backend-relative (e.g. "/products", "/materials")
// and don't include this app's "/dashboard" prefix — every real page lives
// under (dashboard)/dashboard/*, guarded by the session check in
// (dashboard)/layout.tsx. Menu items whose page hasn't been built yet fall
// through to (dashboard)/dashboard/[...rest]/page.tsx (a placeholder), so
// they still render inside the dashboard chrome instead of a bare 404.
export function menuHref(path: string | null): string {
  if (!path || path === "/dashboard") return "/dashboard";
  return path.startsWith("/dashboard") ? path : `/dashboard${path}`;
}

export function flattenMenus(menus: MenuNode[]): MenuNode[] {
  return menus.flatMap((m) => [m, ...flattenMenus(m.children)]);
}
