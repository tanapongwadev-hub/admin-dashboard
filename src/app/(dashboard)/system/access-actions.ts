"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  createDepartment,
  createRole,
  deleteDepartment,
  deleteRole,
  revokeSession,
  updateDepartment,
  updateRole,
  type DepartmentPayload,
  type RolePayload,
} from "@/lib/api/access-master";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export type AccessActionResult = { status: "success" } | { status: "error"; message: string };

async function tokenOrRedirect() {
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) redirectMissingSession();
  return token;
}

function failure(error: unknown, fallback: string): AccessActionResult {
  redirectIfSessionExpired(error);
  if (error instanceof ApiError) return { status: "error", message: apiErrorMessage(error, fallback) };
  return { status: "error", message: CONNECTION_ERROR_MESSAGE };
}

async function run(path: string, fallback: string, work: (token: string) => Promise<unknown>): Promise<AccessActionResult> {
  const token = await tokenOrRedirect();
  try {
    await work(token);
    try {
      revalidatePath(path);
      // Department / role changes also feed the users and permission screens.
      revalidatePath("/system/users");
      revalidatePath("/system/permissions");
    } catch { /* best-effort */ }
    return { status: "success" };
  } catch (error) {
    return failure(error, fallback);
  }
}

export async function createDepartmentAction(payload: DepartmentPayload) {
  return run("/system/departments", "ไม่สามารถสร้างแผนกได้", (token) => createDepartment(token, payload));
}
export async function updateDepartmentAction(id: string, payload: Omit<DepartmentPayload, "code">) {
  return run("/system/departments", "ไม่สามารถแก้ไขแผนกได้", (token) => updateDepartment(token, id, payload));
}
export async function deleteDepartmentAction(id: string) {
  return run("/system/departments", "ไม่สามารถลบแผนกได้", (token) => deleteDepartment(token, id));
}

export async function createRoleAction(payload: RolePayload) {
  return run("/system/roles", "ไม่สามารถสร้าง role ได้", (token) => createRole(token, payload));
}
export async function updateRoleAction(id: string, payload: Omit<RolePayload, "code">) {
  return run("/system/roles", "ไม่สามารถแก้ไข role ได้", (token) => updateRole(token, id, payload));
}
export async function deleteRoleAction(id: string) {
  return run("/system/roles", "ไม่สามารถลบ role ได้", (token) => deleteRole(token, id));
}

export async function revokeSessionAction(id: string) {
  return run("/system/sessions", "ไม่สามารถยกเลิกเซสชันได้", (token) => revokeSession(token, id));
}
