import { apiFetch } from "./client";

// Mirrors cps-api's `/menus` management contract — NOT documented in
// API_ENDPOINTS.md § 4.4 (that section only lists the basic CRUD routes).
// Source of truth: cps-api/src/modules/menus/{menus.controller,menus.service,
// menu-tree-ordering}.ts. Re-read those before changing this file; the
// reorder validation rules (contiguous sibling sortOrder, max depth, no
// cycles, BUTTON menus can't have children) live entirely server-side in
// menu-tree-ordering.ts#validateAndProjectMenuLayout — this file does not
// duplicate them, it only needs to produce a payload that satisfies them.

export type MenuNodeType = "MAIN" | "SUB" | "BUTTON";

export interface ManagementMenuNode {
  id: string;
  parentId: string | null;
  code: string;
  nameTh: string;
  nameEn: string;
  menuType: MenuNodeType;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  isVisible: boolean;
  isActive: boolean;
  children: ManagementMenuNode[];
}

export interface ManagementTreeResponse {
  version: string;
  menus: ManagementMenuNode[];
}

export interface ReorderMenuItem {
  id: string;
  parentId: string | null;
  sortOrder: number;
}

export interface ReorderMenusPayload {
  version: string;
  items: ReorderMenuItem[];
}

export interface ReorderMenusResult {
  version: string;
  updatedCount: number;
}

// SUPER_ADMIN only (JwtAuthGuard + RolesGuard on the whole controller).
export function getManagementTree(accessToken: string) {
  return apiFetch<ManagementTreeResponse>("/menus/management-tree", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// `items` must cover EVERY menu record, not just the ones that moved —
// the backend rejects an incomplete set (400) and rejects a stale
// `version` (409, meaning someone else changed the arrangement first).
export function reorderMenus(accessToken: string, payload: ReorderMenusPayload) {
  return apiFetch<ReorderMenusResult>("/menus/reorder", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}
