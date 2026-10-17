import { apiFetch } from "./client";
import type { RoleSummary } from "./permission-access";

// Access-control master data — cps-api /departments, /roles and /sessions.
// Every route is SUPER_ADMIN only (RolesGuard).

const auth = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });
const json = (accessToken: string) => ({ ...auth(accessToken), "Content-Type": "application/json" });

// ---- Departments ----------------------------------------------------------

export interface Department {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  /** Group department id; null for a top-level group (materials / production / delivery). */
  parentId: string | null;
  isActive: boolean;
  description?: string | null;
  createdAt?: string;
}

export interface DepartmentPayload {
  code?: string;
  nameTh: string;
  nameEn: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
}

export function listDepartmentsAll(accessToken: string) {
  return apiFetch<{ items: Department[] }>("/departments?limit=100", { headers: auth(accessToken) });
}

export function createDepartment(accessToken: string, payload: DepartmentPayload) {
  return apiFetch<Department>("/departments", {
    method: "POST",
    headers: json(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateDepartment(accessToken: string, id: string, payload: Omit<DepartmentPayload, "code">) {
  return apiFetch<Department>(`/departments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: json(accessToken),
    body: JSON.stringify(payload),
  });
}

export function deleteDepartment(accessToken: string, id: string) {
  return apiFetch<unknown>(`/departments/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: auth(accessToken),
  });
}

// ---- Roles ----------------------------------------------------------------

export type RoleScopeType = "SYSTEM" | "DEPARTMENT";

export interface RolePayload {
  code?: string;
  nameTh: string;
  nameEn: string;
  scopeType?: RoleScopeType;
  description?: string;
  isActive?: boolean;
}

export function listRolesAll(accessToken: string) {
  return apiFetch<{ items: RoleSummary[] }>("/roles?limit=100", { headers: auth(accessToken) });
}

export function createRole(accessToken: string, payload: RolePayload) {
  return apiFetch<RoleSummary>("/roles", {
    method: "POST",
    headers: json(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateRole(accessToken: string, id: string, payload: Omit<RolePayload, "code">) {
  return apiFetch<RoleSummary>(`/roles/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: json(accessToken),
    body: JSON.stringify(payload),
  });
}

export function deleteRole(accessToken: string, id: string) {
  return apiFetch<unknown>(`/roles/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: auth(accessToken),
  });
}

// ---- Sessions -------------------------------------------------------------

export interface AuthSessionRow {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  ipAddress: string | null;
  user: { id: string; username: string; firstName: string | null; lastName: string | null } | null;
  activeUserDepartmentRole: {
    department: { id: string; code: string; nameTh: string } | null;
    role: { id: string; code: string; nameTh: string } | null;
  } | null;
}

export interface SessionsPage {
  items: AuthSessionRow[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export function listSessions(accessToken: string, page: number, limit = 20) {
  return apiFetch<SessionsPage>(`/sessions?page=${page}&limit=${limit}`, { headers: auth(accessToken) });
}

export function revokeSession(accessToken: string, id: string) {
  return apiFetch<unknown>(`/sessions/${encodeURIComponent(id)}/revoke`, {
    method: "PATCH",
    headers: auth(accessToken),
  });
}
