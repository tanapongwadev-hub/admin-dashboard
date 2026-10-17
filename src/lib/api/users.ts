import { apiFetch } from "./client";

// Mirrors cps-api `/users` (cps-api/src/modules/users, API_ENDPOINTS.md § 4.1).
// Every route is SUPER_ADMIN only. Overrides (ALLOW/DENY per person) live in
// lib/api/permission-access.ts and are edited at /system/permissions?tab=users.

export type UserStatusFilter = "active" | "inactive";
export type RoleScopeType = "SYSTEM" | "DEPARTMENT";

export interface UserListAssignment {
  id: string;
  departmentId: string | null;
  roleId: string;
  isActive: boolean;
  department: { id: string; code: string; nameTh: string } | null;
  role: { id: string; code: string; nameTh: string; scopeType: RoleScopeType } | null;
}

export interface UserListItem {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  telephone: string | null;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  assignments: UserListAssignment[];
}

export interface UserListResult {
  items: UserListItem[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatusFilter;
}

/** One assignment in a create/aggregate-update payload. */
export interface UserAssignmentInput {
  /** Existing assignment id — keeps its overrides. Omit for a new row. */
  id?: string;
  /** null for a SYSTEM-scope role (e.g. SUPER_ADMIN). */
  departmentId: string | null;
  roleId: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  telephone?: string;
  assignments: Omit<UserAssignmentInput, "id">[];
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  /** null clears the field. */
  email?: string | null;
  telephone?: string | null;
  /** Replaces the whole set; rows with `id` keep their overrides. */
  assignments?: UserAssignmentInput[];
}

export interface DepartmentOption {
  id: string;
  code: string;
  nameTh: string;
  isActive: boolean;
}

function auth(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

function userPath(id: string, suffix = "") {
  return `/users/${encodeURIComponent(id)}${suffix}`;
}

export function listUsers(accessToken: string, params: ListUsersParams = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  const qs = query.toString();
  return apiFetch<UserListResult>(`/users${qs ? `?${qs}` : ""}`, {
    headers: auth(accessToken),
  });
}

export function createUser(accessToken: string, payload: CreateUserPayload) {
  return apiFetch<UserListItem>("/users", {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateUser(accessToken: string, id: string, payload: UpdateUserPayload) {
  return apiFetch<UserListItem>(userPath(id), {
    method: "PATCH",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateUserStatus(accessToken: string, id: string, isActive: boolean) {
  return apiFetch<UserListItem>(userPath(id, "/status"), {
    method: "PATCH",
    headers: auth(accessToken),
    body: JSON.stringify({ isActive }),
  });
}

export function resetUserPassword(accessToken: string, id: string, newPassword: string) {
  return apiFetch<{ message: string }>(userPath(id, "/reset-password"), {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify({ newPassword }),
  });
}

// 409 when the account already has history (sessions, audit rows, documents).
export function deleteUser(accessToken: string, id: string) {
  return apiFetch<{ message: string }>(userPath(id), {
    method: "DELETE",
    headers: auth(accessToken),
  });
}

export function listDepartments(accessToken: string) {
  return apiFetch<{ items: DepartmentOption[] }>("/departments?limit=100", {
    headers: auth(accessToken),
  });
}
