// Pure helpers for the /system/permissions department matrix. Framework
// agnostic (same split as lib/menu-tree.ts) so the toggle rules can be
// tested without React. Mirrors cps-api's access rule:
// ALL = every department, DEPARTMENTS = listed departments only (empty =
// nobody). See docs/plans/2026-10-17-permission-management-plan.md.

import type {
  MatrixMenu,
  MatrixPermission,
  PermissionAccessItem,
  PermissionAccessScope,
} from "./api/permission-access";

export interface PermissionAccess {
  accessScope: PermissionAccessScope;
  departmentIds: string[];
}

/** permissionId → staged access. */
export type AccessMap = Record<string, PermissionAccess>;

export type CellState = "open" | "all" | "closed";

export function toAccessMap(permissions: readonly MatrixPermission[]): AccessMap {
  const map: AccessMap = {};
  for (const permission of permissions) {
    map[permission.id] = {
      accessScope: permission.accessScope,
      departmentIds: [...permission.departmentIds],
    };
  }
  return map;
}

export function isOpenTo(access: PermissionAccess, departmentId: string): boolean {
  return access.accessScope === "ALL" || access.departmentIds.includes(departmentId);
}

export function cellState(access: PermissionAccess, departmentId: string): CellState {
  if (access.accessScope === "ALL") return "all";
  return access.departmentIds.includes(departmentId) ? "open" : "closed";
}

/**
 * Opens or closes one permission for one department. Closing an ALL
 * permission converts it to DEPARTMENTS listing every other active
 * department, so nobody else loses access.
 */
export function setOpenFor(
  access: PermissionAccess,
  departmentId: string,
  open: boolean,
  activeDepartmentIds: readonly string[],
): PermissionAccess {
  if (open) {
    if (isOpenTo(access, departmentId)) return access;
    return { accessScope: "DEPARTMENTS", departmentIds: [...access.departmentIds, departmentId] };
  }
  if (!isOpenTo(access, departmentId)) return access;
  const base = access.accessScope === "ALL" ? activeDepartmentIds : access.departmentIds;
  return {
    accessScope: "DEPARTMENTS",
    departmentIds: base.filter((id) => id !== departmentId),
  };
}

/**
 * Toggles one cell and keeps the READ rule the API enforces: opening any
 * other action also opens READ of the same menu, closing READ closes every
 * action of the menu for that department.
 */
export function toggleCell(
  map: AccessMap,
  permissions: readonly MatrixPermission[],
  permissionId: string,
  departmentId: string,
  open: boolean,
  activeDepartmentIds: readonly string[],
): AccessMap {
  const target = permissions.find((permission) => permission.id === permissionId);
  if (!target || !map[permissionId]) return map;
  const next: AccessMap = { ...map };
  const apply = (id: string, value: boolean) => {
    if (next[id]) next[id] = setOpenFor(next[id], departmentId, value, activeDepartmentIds);
  };

  apply(permissionId, open);
  const siblings = permissions.filter(
    (permission) => permission.menuId === target.menuId && permission.id !== target.id,
  );
  if (open && target.actionCode !== "READ") {
    const read = siblings.find((permission) => permission.actionCode === "READ");
    if (read) apply(read.id, true);
  }
  if (!open && target.actionCode === "READ") {
    for (const sibling of siblings) apply(sibling.id, false);
  }
  return next;
}

/** Applies toggleCell to several permissions in order (group/column toggles). */
export function toggleCells(
  map: AccessMap,
  permissions: readonly MatrixPermission[],
  permissionIds: readonly string[],
  departmentId: string,
  open: boolean,
  activeDepartmentIds: readonly string[],
): AccessMap {
  return permissionIds.reduce(
    (current, id) => toggleCell(current, permissions, id, departmentId, open, activeDepartmentIds),
    map,
  );
}

/** Reopens permissions to every department. */
export function openToAll(map: AccessMap, permissionIds: readonly string[]): AccessMap {
  const next: AccessMap = { ...map };
  for (const id of permissionIds) {
    if (next[id]) next[id] = { accessScope: "ALL", departmentIds: [] };
  }
  return next;
}

function sameAccess(a: PermissionAccess, b: PermissionAccess): boolean {
  if (a.accessScope !== b.accessScope) return false;
  if (a.departmentIds.length !== b.departmentIds.length) return false;
  const set = new Set(a.departmentIds);
  return b.departmentIds.every((id) => set.has(id));
}

/** Items for PUT /permissions/access: only permissions whose access changed. */
export function diffAccess(original: AccessMap, current: AccessMap): PermissionAccessItem[] {
  return Object.keys(current)
    .filter((id) => original[id] && !sameAccess(original[id], current[id]))
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => ({
      permissionId: id,
      accessScope: current[id].accessScope,
      departmentIds:
        current[id].accessScope === "ALL"
          ? []
          : [...current[id].departmentIds].sort((a, b) => Number(a) - Number(b)),
    }));
}

export interface MatrixRow {
  menu: MatrixMenu;
  depth: number;
  parentId: string | null;
  childIds: string[];
  /** actionCode → permission of this menu. */
  permissionsByAction: Record<string, MatrixPermission>;
  /** Permission ids of this menu and every descendant, keyed by action code. */
  subtreePermissionIds: Record<string, string[]>;
}

/** Depth-first rows (parents before children), ordered like the sidebar. */
export function buildMatrixRows(
  menus: readonly MatrixMenu[],
  permissions: readonly MatrixPermission[],
): MatrixRow[] {
  const byParent = new Map<string | null, MatrixMenu[]>();
  const ids = new Set(menus.map((menu) => menu.id));
  for (const menu of menus) {
    const parent = menu.parentId && ids.has(menu.parentId) ? menu.parentId : null;
    const siblings = byParent.get(parent) ?? [];
    siblings.push(menu);
    byParent.set(parent, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id) - Number(b.id));
  }
  const permissionsByMenu = new Map<string, MatrixPermission[]>();
  for (const permission of permissions) {
    const list = permissionsByMenu.get(permission.menuId) ?? [];
    list.push(permission);
    permissionsByMenu.set(permission.menuId, list);
  }

  const rows: MatrixRow[] = [];
  const visit = (menu: MatrixMenu, depth: number, parentId: string | null, seen: Set<string>) => {
    if (seen.has(menu.id)) return;
    seen.add(menu.id);
    const permissionsByAction: Record<string, MatrixPermission> = {};
    for (const permission of permissionsByMenu.get(menu.id) ?? []) {
      permissionsByAction[permission.actionCode] = permission;
    }
    const children = byParent.get(menu.id) ?? [];
    const row: MatrixRow = {
      menu,
      depth,
      parentId,
      childIds: children.map((child) => child.id),
      permissionsByAction,
      subtreePermissionIds: {},
    };
    rows.push(row);
    for (const child of children) visit(child, depth + 1, menu.id, seen);
  };
  const seen = new Set<string>();
  for (const root of byParent.get(null) ?? []) visit(root, 0, null, seen);

  // Accumulate subtree permission ids bottom-up (rows are depth-first).
  const rowById = new Map(rows.map((row) => [row.menu.id, row]));
  for (let index = rows.length - 1; index >= 0; index--) {
    const row = rows[index];
    for (const [action, permission] of Object.entries(row.permissionsByAction)) {
      (row.subtreePermissionIds[action] ??= []).unshift(permission.id);
    }
    if (row.parentId) {
      const parent = rowById.get(row.parentId);
      if (!parent) continue;
      for (const [action, descendantIds] of Object.entries(row.subtreePermissionIds)) {
        (parent.subtreePermissionIds[action] ??= []).unshift(...descendantIds);
      }
    }
  }
  return rows;
}

/** Rows matching the query plus their ancestors (so the tree stays readable). */
export function filterRows(rows: readonly MatrixRow[], query: string): MatrixRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...rows];
  const rowById = new Map(rows.map((row) => [row.menu.id, row]));
  const keep = new Set<string>();
  for (const row of rows) {
    const haystack = `${row.menu.nameTh} ${row.menu.nameEn} ${row.menu.code} ${row.menu.path ?? ""}`.toLowerCase();
    if (!haystack.includes(needle)) continue;
    let current: MatrixRow | undefined = row;
    while (current && !keep.has(current.menu.id)) {
      keep.add(current.menu.id);
      current = current.parentId ? rowById.get(current.parentId) : undefined;
    }
  }
  return rows.filter((row) => keep.has(row.menu.id));
}

/**
 * Menus a department would see in the sidebar: active, visible, non-BUTTON
 * menus with a path that have at least one active permission open to it.
 */
export function countVisibleMenus(
  rows: readonly MatrixRow[],
  map: AccessMap,
  departmentId: string,
): number {
  return rows.filter((row) => {
    const { menu } = row;
    if (!menu.isActive || !menu.isVisible || menu.menuType === "BUTTON" || !menu.path) {
      return false;
    }
    return Object.values(row.permissionsByAction).some(
      (permission) => permission.isActive && map[permission.id] && isOpenTo(map[permission.id], departmentId),
    );
  }).length;
}

/** Tri-state for a group column toggle over the given permission ids. */
export function groupState(
  map: AccessMap,
  permissionIds: readonly string[],
  departmentId: string,
): boolean | "indeterminate" {
  const states = permissionIds
    .filter((id) => map[id])
    .map((id) => isOpenTo(map[id], departmentId));
  if (states.length === 0) return false;
  if (states.every(Boolean)) return true;
  if (states.some(Boolean)) return "indeterminate";
  return false;
}

/** roleId → action codes (as stored, upper-case). */
export type RoleActionMap = Record<string, string[]>;

/** Items for PUT /roles/actions: roles whose action set changed. */
export function diffRoleActions(
  original: RoleActionMap,
  current: RoleActionMap,
): { roleId: string; actionCodes: string[] }[] {
  return Object.keys(current)
    .filter((roleId) => {
      const before = [...(original[roleId] ?? [])].sort().join(",");
      return before !== [...current[roleId]].sort().join(",");
    })
    .sort((a, b) => Number(a) - Number(b))
    .map((roleId) => ({ roleId, actionCodes: [...current[roleId]].sort() }));
}

/** Toggles one action of a role; removing READ removes every action. */
export function toggleRoleAction(codes: readonly string[], actionCode: string, on: boolean): string[] {
  if (on) return codes.includes(actionCode) ? [...codes] : [...codes, actionCode, ...(codes.includes("READ") ? [] : ["READ"])];
  if (actionCode === "READ") return [];
  return codes.filter((code) => code !== actionCode);
}

export type OverrideEffect = "ALLOW" | "DENY";

export interface OverrideEntry {
  effect: OverrideEffect;
  /** ISO date-time or null for no expiry. */
  expiresAt: string | null;
}

/** permissionId → override of one assignment. */
export type OverrideMap = Record<string, OverrideEntry>;

export type EffectiveReason =
  | "USER_ALLOW"
  | "USER_DENY"
  | "ROLE"
  | "ROLE_LACKS_ACTION"
  | "DEPARTMENT_BLOCKED"
  | "INACTIVE";

/**
 * What one assignment effectively gets for one permission. Mirrors cps-api
 * AccessControlService: an unexpired DENY always wins, an unexpired ALLOW
 * grants even outside the department scope, otherwise the role must have
 * the action and the department scope must include the department.
 */
export function effectivePermission(
  permission: Pick<MatrixPermission, "id" | "actionCode" | "isActive">,
  context: {
    departmentId: string | null;
    roleActionCodes: readonly string[];
    access: AccessMap;
    overrides: OverrideMap;
    now?: number;
  },
): { granted: boolean; reason: EffectiveReason } {
  if (!permission.isActive) return { granted: false, reason: "INACTIVE" };
  const override = context.overrides[permission.id];
  const now = context.now ?? Date.now();
  if (override && !(override.expiresAt && new Date(override.expiresAt).getTime() <= now)) {
    return override.effect === "DENY"
      ? { granted: false, reason: "USER_DENY" }
      : { granted: true, reason: "USER_ALLOW" };
  }
  if (!context.roleActionCodes.includes(permission.actionCode)) {
    return { granted: false, reason: "ROLE_LACKS_ACTION" };
  }
  const access = context.access[permission.id];
  const open =
    access &&
    (access.accessScope === "ALL" ||
      (context.departmentId !== null && access.departmentIds.includes(context.departmentId)));
  return open ? { granted: true, reason: "ROLE" } : { granted: false, reason: "DEPARTMENT_BLOCKED" };
}

/** Cycles a cell: no override → ALLOW → DENY → no override. */
export function cycleOverride(map: OverrideMap, permissionId: string): OverrideMap {
  const next: OverrideMap = { ...map };
  const current = map[permissionId];
  if (!current) next[permissionId] = { effect: "ALLOW", expiresAt: null };
  else if (current.effect === "ALLOW") next[permissionId] = { ...current, effect: "DENY" };
  else delete next[permissionId];
  return next;
}

export function sameOverrides(a: OverrideMap, b: OverrideMap): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every(
    (key) => b[key] && b[key].effect === a[key].effect && (b[key].expiresAt ?? null) === (a[key].expiresAt ?? null),
  );
}
