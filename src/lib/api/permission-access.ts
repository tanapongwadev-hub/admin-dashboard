import { apiFetch } from "./client";

// Mirrors cps-api `GET /permissions/matrix` and `PUT /permissions/access`
// (cps-api/src/modules/permissions/permissions.service.ts, API_ENDPOINTS.md
// § 4.5). Both are SUPER_ADMIN only. See
// docs/plans/2026-10-17-permission-management-plan.md for the access model.

export type PermissionAccessScope = "ALL" | "DEPARTMENTS";

export interface MatrixAction {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  sortOrder: number;
}

export interface MatrixDepartment {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  isActive: boolean;
}

export interface MatrixMenu {
  id: string;
  parentId: string | null;
  code: string;
  nameTh: string;
  nameEn: string;
  menuType: "MAIN" | "SUB" | "BUTTON";
  path: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  isVisible: boolean;
}

export interface MatrixPermission {
  id: string;
  code: string;
  description: string | null;
  menuId: string;
  actionId: string;
  actionCode: string;
  isActive: boolean;
  accessScope: PermissionAccessScope;
  /** Always empty when accessScope is ALL. */
  departmentIds: string[];
}

export interface PermissionMatrix {
  version: string;
  actions: MatrixAction[];
  departments: MatrixDepartment[];
  menus: MatrixMenu[];
  permissions: MatrixPermission[];
}

export interface PermissionAccessItem {
  permissionId: string;
  accessScope: PermissionAccessScope;
  departmentIds: string[];
}

export interface UpdatePermissionAccessPayload {
  version: string;
  reason: string;
  items: PermissionAccessItem[];
}

export function getPermissionMatrix(accessToken: string) {
  return apiFetch<PermissionMatrix>("/permissions/matrix", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// 409 = someone else changed a scope since `version` was read; 400 carries
// `violations` when a department would keep an action without READ.
export function updatePermissionAccess(
  accessToken: string,
  payload: UpdatePermissionAccessPayload,
) {
  return apiFetch<PermissionMatrix>("/permissions/access", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

// Roles — cps-api `GET /roles` and `PUT /roles/actions` (SUPER_ADMIN only).
// A role grants actions across every menu; departments decide which menus.

export interface RoleSummary {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  scopeType: "SYSTEM" | "DEPARTMENT";
  isActive: boolean;
  isSystem: boolean;
  description: string | null;
  actionCodes: string[];
  userCount: number;
}

export interface RoleActionsItem {
  roleId: string;
  actionCodes: string[];
}

export function listRoles(accessToken: string) {
  return apiFetch<{ items: RoleSummary[] }>("/roles?limit=100", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// One transaction for every role; SUPER_ADMIN and unknown action codes are
// rejected with 400. Unchanged roles are skipped (no Audit row).
export function updateRoleActions(
  accessToken: string,
  payload: { reason: string; items: RoleActionsItem[] },
) {
  return apiFetch<{ changed: number; items: RoleSummary[] }>("/roles/actions", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

// Users, assignments and per-person overrides — cps-api `/users` (SUPER_ADMIN
// only). Overrides: ALLOW applies even outside the department scope, DENY
// always wins, entries past `expiresAt` are ignored.

export interface UserListItem {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
}

export interface UserAssignment {
  id: string;
  departmentId: string | null;
  roleId: string;
  isActive: boolean;
  expiredAt: string | null;
  department: { id: string; code: string; nameTh: string } | null;
  role: { id: string; code: string; nameTh: string } | null;
}

export interface AssignmentOverride {
  permissionId: string;
  permissionCode: string | null;
  effect: "ALLOW" | "DENY";
  expiresAt: string | null;
  expired: boolean;
}

export interface AssignmentOverrides {
  assignmentId: string;
  departmentId: string | null;
  roleId: string;
  items: AssignmentOverride[];
}

export function listUsers(accessToken: string) {
  return apiFetch<{ items: UserListItem[] }>("/users?limit=100", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function listUserAssignments(accessToken: string, userId: string) {
  return apiFetch<UserAssignment[]>(`/users/${encodeURIComponent(userId)}/assignments`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getAssignmentOverrides(accessToken: string, userId: string, assignmentId: string) {
  return apiFetch<AssignmentOverrides>(
    `/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/permissions`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export function replaceAssignmentOverrides(
  accessToken: string,
  userId: string,
  assignmentId: string,
  payload: {
    reason: string;
    items: { permissionId: string; effect: "ALLOW" | "DENY"; expiresAt: string | null }[];
  },
) {
  return apiFetch<AssignmentOverrides & { changed: boolean }>(
    `/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/permissions`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    },
  );
}
