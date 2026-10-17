"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  getPermissionMatrix,
  listRoles,
  listUserAssignments,
  getAssignmentOverrides,
  replaceAssignmentOverrides,
  type AssignmentOverrides,
  type UserAssignment,
  updateRoleActions,
  type RoleActionsItem,
  type RoleSummary,
  updatePermissionAccess,
  type PermissionAccessItem,
  type PermissionMatrix,
} from "@/lib/api/permission-access";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export type PermissionMatrixResult =
  | { status: "success"; matrix: PermissionMatrix }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

interface ReadViolation {
  departmentCode?: string | null;
  readPermissionCode?: string;
  permissionCodes?: string[];
}

/** Appends the API's READ-dependency violations so the admin sees which ones. */
function violationDetail(error: ApiError): string {
  const body = error.body as { violations?: ReadViolation[] } | null;
  const violations = Array.isArray(body?.violations) ? body.violations : [];
  if (violations.length === 0) return "";
  const lines = violations
    .slice(0, 5)
    .map(
      (violation) =>
        `แผนก ${violation.departmentCode ?? "-"}: ต้องเปิด ${violation.readPermissionCode ?? "สิทธิ์ดู"} ด้วย (${(violation.permissionCodes ?? []).join(", ")})`,
    );
  if (violations.length > 5) lines.push(`และอีก ${violations.length - 5} รายการ`);
  return ` — ${lines.join("; ")}`;
}

// `perform*` helpers take the token so tests can call them directly (same
// split as system/menus/actions.ts).
export async function performRefreshPermissionMatrix(
  accessToken: string,
): Promise<PermissionMatrixResult> {
  try {
    return { status: "success", matrix: await getPermissionMatrix(accessToken) };
  } catch (error) {
    redirectIfSessionExpired(error);
    if (error instanceof ApiError) {
      return { status: "error", message: apiErrorMessage(error, "ไม่สามารถโหลดข้อมูลสิทธิ์ได้") };
    }
    return { status: "error", message: CONNECTION_ERROR_MESSAGE };
  }
}

export async function performSavePermissionAccess(
  accessToken: string,
  version: string,
  reason: string,
  items: PermissionAccessItem[],
): Promise<PermissionMatrixResult> {
  try {
    const matrix = await updatePermissionAccess(accessToken, { version, reason, items });
    try { revalidatePath("/system/permissions"); } catch { /* best-effort */ }
    return { status: "success", matrix };
  } catch (error) {
    redirectIfSessionExpired(error);
    if (error instanceof ApiError && error.status === 409) {
      return {
        status: "conflict",
        message: "มีผู้ดูแลคนอื่นแก้สิทธิ์ไปแล้ว กรุณาโหลดข้อมูลล่าสุดแล้วตั้งค่าใหม่",
      };
    }
    if (error instanceof ApiError) {
      return {
        status: "error",
        message: apiErrorMessage(error, "ไม่สามารถบันทึกสิทธิ์ได้") + violationDetail(error),
      };
    }
    return { status: "error", message: CONNECTION_ERROR_MESSAGE };
  }
}

export async function refreshPermissionMatrixAction(): Promise<PermissionMatrixResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performRefreshPermissionMatrix(accessToken);
}

export async function savePermissionAccessAction(
  version: string,
  reason: string,
  items: PermissionAccessItem[],
): Promise<PermissionMatrixResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performSavePermissionAccess(accessToken, version, reason, items);
}

export type RoleActionsResult =
  | { status: "success"; changed: number; roles: RoleSummary[] }
  | { status: "error"; message: string };

export async function performSaveRoleActions(
  accessToken: string,
  reason: string,
  items: RoleActionsItem[],
): Promise<RoleActionsResult> {
  try {
    const result = await updateRoleActions(accessToken, { reason, items });
    try { revalidatePath("/system/permissions"); } catch { /* best-effort */ }
    return { status: "success", changed: result.changed, roles: result.items };
  } catch (error) {
    redirectIfSessionExpired(error);
    if (error instanceof ApiError) {
      return { status: "error", message: apiErrorMessage(error, "ไม่สามารถบันทึก action ของ role ได้") };
    }
    return { status: "error", message: CONNECTION_ERROR_MESSAGE };
  }
}

export async function performRefreshRoles(accessToken: string): Promise<RoleActionsResult> {
  try {
    const result = await listRoles(accessToken);
    return { status: "success", changed: 0, roles: result.items };
  } catch (error) {
    redirectIfSessionExpired(error);
    if (error instanceof ApiError) {
      return { status: "error", message: apiErrorMessage(error, "ไม่สามารถโหลดข้อมูล role ได้") };
    }
    return { status: "error", message: CONNECTION_ERROR_MESSAGE };
  }
}

export async function saveRoleActionsAction(
  reason: string,
  items: RoleActionsItem[],
): Promise<RoleActionsResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performSaveRoleActions(accessToken, reason, items);
}

export async function refreshRolesAction(): Promise<RoleActionsResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performRefreshRoles(accessToken);
}

export type AssignmentsResult =
  | { status: "success"; assignments: UserAssignment[] }
  | { status: "error"; message: string };

export type OverridesResult =
  | { status: "success"; overrides: AssignmentOverrides; changed?: boolean }
  | { status: "error"; message: string };

function failure(error: unknown, fallback: string): { status: "error"; message: string } {
  redirectIfSessionExpired(error);
  if (error instanceof ApiError) return { status: "error", message: apiErrorMessage(error, fallback) };
  return { status: "error", message: CONNECTION_ERROR_MESSAGE };
}

export async function performLoadAssignments(accessToken: string, userId: string): Promise<AssignmentsResult> {
  try {
    return { status: "success", assignments: await listUserAssignments(accessToken, userId) };
  } catch (error) {
    return failure(error, "ไม่สามารถโหลดการมอบหมายของผู้ใช้ได้");
  }
}

export async function performLoadOverrides(
  accessToken: string,
  userId: string,
  assignmentId: string,
): Promise<OverridesResult> {
  try {
    return { status: "success", overrides: await getAssignmentOverrides(accessToken, userId, assignmentId) };
  } catch (error) {
    return failure(error, "ไม่สามารถโหลดสิทธิ์รายบุคคลได้");
  }
}

export async function performSaveOverrides(
  accessToken: string,
  userId: string,
  assignmentId: string,
  reason: string,
  items: { permissionId: string; effect: "ALLOW" | "DENY"; expiresAt: string | null }[],
): Promise<OverridesResult> {
  try {
    const result = await replaceAssignmentOverrides(accessToken, userId, assignmentId, { reason, items });
    return { status: "success", overrides: result, changed: result.changed };
  } catch (error) {
    return failure(error, "ไม่สามารถบันทึกสิทธิ์รายบุคคลได้");
  }
}

export async function loadAssignmentsAction(userId: string): Promise<AssignmentsResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performLoadAssignments(accessToken, userId);
}

export async function loadOverridesAction(userId: string, assignmentId: string): Promise<OverridesResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performLoadOverrides(accessToken, userId, assignmentId);
}

export async function saveOverridesAction(
  userId: string,
  assignmentId: string,
  reason: string,
  items: { permissionId: string; effect: "ALLOW" | "DENY"; expiresAt: string | null }[],
): Promise<OverridesResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performSaveOverrides(accessToken, userId, assignmentId, reason, items);
}
