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
  { label: "ตั้งค่า", href: "/settings", icon: Settings },
];

// cps-api menu paths map 1:1 to this app's real routes — every page lives
// directly under the (dashboard) route group at its own top-level path
// (e.g. "/products", "/materials"), guarded by the session check in
// (dashboard)/layout.tsx. The dashboard home page is the one exception:
// cps-api's own path for it is "/dashboard", which already matches.
// Menu items whose page hasn't been built yet fall through to
// (dashboard)/[...rest]/page.tsx (a placeholder), so they still render
// inside the dashboard chrome instead of a bare 404.
//
// cps-api's Menu.path is a free-form, optional string (no format
// validation in CreateMenuDto/UpdateMenuDto) editable by any SUPER_ADMIN.
// Reject anything that isn't a same-origin absolute path — otherwise a
// menu row could carry an absolute/protocol-relative URL (e.g.
// "//evil.example") and render as a same-looking sidebar link that
// silently navigates elsewhere.
const SAME_ORIGIN_PATH = /^\/(?!\/)/;
export function menuHref(path: string | null): string {
  if (path && SAME_ORIGIN_PATH.test(path)) return path;
  return "/dashboard";
}

export function flattenMenus(menus: MenuNode[]): MenuNode[] {
  return menus.flatMap((m) => [m, ...flattenMenus(m.children)]);
}
