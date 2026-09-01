import { apiFetch } from "./client";

// Mirrors cps-api's `/auth` contract — see cps-api/API_ENDPOINTS.md § 3
// and cps-api/src/modules/auth/auth.service.ts (buildAuthenticationResponse).

export interface LoginPayload {
  username: string;
  password: string;
}

export interface DepartmentOption {
  userDepartmentRoleId: string;
  departmentId: string | null;
  departmentCode: string;
  departmentName: string;
  roleCode: string;
}

export interface DepartmentSelectionRequired {
  requiresDepartmentSelection: true;
  departmentSelectionToken: string;
  departments: DepartmentOption[];
}

export interface AuthenticationTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string | null;
  isSuperAdmin: boolean;
  departments: { id: string; code: string; name: string }[];
  roles: { id: string; code: string; name: string }[];
}

export interface CurrentDepartmentRole {
  id: string;
  userId: string;
  departmentId: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  roleId: string;
  roleName: string;
  roleCode: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginSuccess {
  success: true;
  message: string;
  data: {
    authentication: AuthenticationTokens;
    user: AuthenticatedUser;
    currentDepartmentRole: CurrentDepartmentRole | null;
    accessControl: {
      menus: unknown[];
      permissions: unknown[];
      userDepartmentRoleId: string | null;
      departmentId: string | null;
      roleId: string | null;
    };
  };
  timestamp: string;
}

export type LoginResponse = LoginSuccess | DepartmentSelectionRequired;

export interface SelectDepartmentPayload {
  departmentSelectionToken?: string;
  userDepartmentRoleId: string;
}

export function login(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function selectDepartment(payload: SelectDepartmentPayload) {
  return apiFetch<LoginSuccess>("/auth/select-department", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function isDepartmentSelectionRequired(
  response: LoginResponse
): response is DepartmentSelectionRequired {
  return "requiresDepartmentSelection" in response;
}
