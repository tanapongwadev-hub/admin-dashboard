import { apiFetch } from "./client";
import type { UserAssignment } from "./permission-access";

// Mirrors cps-api `/users` and `/departments` (cps-api/src/modules/users,
// src/modules/departments). Every route is SUPER_ADMIN only (RolesGuard).
// Per-person ALLOW/DENY overrides live in ./permission-access.ts and are
// edited on /system/permissions?tab=users, not here.

export interface UserRow {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
}

export interface UserDetail extends UserRow {
  telephone: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  updatedAt: string;
}

export interface PaginatedUsers {
  items: UserRow[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface DepartmentOption {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  isActive: boolean;
}

export interface AssignmentPayload {
  departmentId: string;
  roleId: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  telephone?: string;
  assignments: AssignmentPayload[];
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  telephone?: string;
}

function auth(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

function userPath(id: string, suffix = "") {
  return `/users/${encodeURIComponent(id)}${suffix}`;
}

export function listUsersPage(
  accessToken: string,
  params: { page: number; limit: number; search?: string },
) {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search) query.set("search", params.search);
  return apiFetch<PaginatedUsers>(`/users?${query}`, { headers: auth(accessToken) });
}

export function getUser(accessToken: string, id: string) {
  return apiFetch<UserDetail>(userPath(id), { headers: auth(accessToken) });
}

export function createUser(accessToken: string, payload: CreateUserPayload) {
  return apiFetch<UserDetail>("/users", {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateUser(accessToken: string, id: string, payload: UpdateUserPayload) {
  return apiFetch<UserDetail>(userPath(id), {
    method: "PATCH",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

// 400 when it would disable the last active SUPER_ADMIN.
export function updateUserStatus(accessToken: string, id: string, isActive: boolean) {
  return apiFetch<UserDetail>(userPath(id, "/status"), {
    method: "PATCH",
    headers: auth(accessToken),
    body: JSON.stringify({ isActive }),
  });
}

// Bumps the user's permissionVersion, so their open sessions are signed out.
export function resetUserPassword(accessToken: string, id: string, newPassword: string) {
  return apiFetch<{ message: string }>(userPath(id, "/reset-password"), {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify({ newPassword }),
  });
}

// Hard delete: removes the user, assignments and overrides. Prefer disabling.
export function deleteUser(accessToken: string, id: string) {
  return apiFetch<{ message: string }>(userPath(id), {
    method: "DELETE",
    headers: auth(accessToken),
  });
}

export function listAssignments(accessToken: string, userId: string) {
  return apiFetch<UserAssignment[]>(userPath(userId, "/assignments"), {
    headers: auth(accessToken),
  });
}

// One assignment per department per user (400 on a duplicate).
export function createAssignment(accessToken: string, userId: string, payload: AssignmentPayload) {
  return apiFetch<UserAssignment[]>(userPath(userId, "/assignments"), {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

// `permissionIds` is deliberately never sent: omitting it keeps the
// assignment's ALLOW/DENY overrides (cps-api UsersService#updateAssignment).
export function updateAssignment(
  accessToken: string,
  userId: string,
  assignmentId: string,
  payload: AssignmentPayload,
) {
  return apiFetch<UserAssignment>(
    userPath(userId, `/assignments/${encodeURIComponent(assignmentId)}`),
    { method: "PATCH", headers: auth(accessToken), body: JSON.stringify(payload) },
  );
}

export function deleteAssignment(accessToken: string, userId: string, assignmentId: string) {
  return apiFetch<{ message: string }>(
    userPath(userId, `/assignments/${encodeURIComponent(assignmentId)}`),
    { method: "DELETE", headers: auth(accessToken) },
  );
}

export function listDepartments(accessToken: string) {
  return apiFetch<{ items: DepartmentOption[] }>("/departments?limit=100", {
    headers: auth(accessToken),
  });
}
