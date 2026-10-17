"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import type { UserAssignment } from "@/lib/api/permission-access";
import {
  createAssignment,
  createUser,
  deleteAssignment,
  deleteUser,
  listAssignments,
  resetUserPassword,
  updateAssignment,
  updateUser,
  updateUserStatus,
  type AssignmentPayload,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserDetail,
} from "@/lib/api/users";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export type ActionFailure = { status: "error"; message: string };
export type UserActionResult = { status: "success"; user: UserDetail } | ActionFailure;
export type DoneActionResult = { status: "success" } | ActionFailure;
export type AssignmentsActionResult =
  | { status: "success"; assignments: UserAssignment[] }
  | ActionFailure;

const PATH = "/system/users";

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function failure(error: unknown, fallback: string): ActionFailure {
  redirectIfSessionExpired(error);
  if (error instanceof ApiError) return { status: "error", message: apiErrorMessage(error, fallback) };
  return { status: "error", message: CONNECTION_ERROR_MESSAGE };
}

function revalidate() {
  try { revalidatePath(PATH); } catch { /* best-effort */ }
}

// `perform*` helpers take the token so tests can call them directly (same
// split as system/menus/actions.ts).
export async function performCreateUser(
  accessToken: string,
  payload: CreateUserPayload,
): Promise<UserActionResult> {
  try {
    const user = await createUser(accessToken, payload);
    revalidate();
    return { status: "success", user };
  } catch (error) {
    return failure(error, "ไม่สามารถสร้างผู้ใช้ได้");
  }
}

export async function performUpdateUser(
  accessToken: string,
  id: string,
  payload: UpdateUserPayload,
): Promise<UserActionResult> {
  try {
    const user = await updateUser(accessToken, id, payload);
    revalidate();
    return { status: "success", user };
  } catch (error) {
    return failure(error, "ไม่สามารถบันทึกข้อมูลผู้ใช้ได้");
  }
}

export async function performSetUserStatus(
  accessToken: string,
  id: string,
  isActive: boolean,
): Promise<UserActionResult> {
  try {
    const user = await updateUserStatus(accessToken, id, isActive);
    revalidate();
    return { status: "success", user };
  } catch (error) {
    return failure(error, "ไม่สามารถเปลี่ยนสถานะผู้ใช้ได้");
  }
}

export async function performResetPassword(
  accessToken: string,
  id: string,
  newPassword: string,
): Promise<DoneActionResult> {
  try {
    await resetUserPassword(accessToken, id, newPassword);
    return { status: "success" };
  } catch (error) {
    return failure(error, "ไม่สามารถตั้งรหัสผ่านใหม่ได้");
  }
}

export async function performDeleteUser(accessToken: string, id: string): Promise<DoneActionResult> {
  try {
    await deleteUser(accessToken, id);
    revalidate();
    return { status: "success" };
  } catch (error) {
    return failure(error, "ไม่สามารถลบผู้ใช้ได้ ลองปิดใช้งานแทน");
  }
}

export async function performListAssignments(
  accessToken: string,
  userId: string,
): Promise<AssignmentsActionResult> {
  try {
    return { status: "success", assignments: await listAssignments(accessToken, userId) };
  } catch (error) {
    return failure(error, "ไม่สามารถโหลดแผนกและ role ของผู้ใช้ได้");
  }
}

export async function performAddAssignment(
  accessToken: string,
  userId: string,
  payload: AssignmentPayload,
): Promise<AssignmentsActionResult> {
  try {
    const assignments = await createAssignment(accessToken, userId, payload);
    return { status: "success", assignments };
  } catch (error) {
    return failure(error, "ไม่สามารถเพิ่มแผนกได้");
  }
}

// Returns the full refreshed list so the dialog never shows a stale row.
export async function performUpdateAssignment(
  accessToken: string,
  userId: string,
  assignmentId: string,
  payload: AssignmentPayload,
): Promise<AssignmentsActionResult> {
  try {
    await updateAssignment(accessToken, userId, assignmentId, payload);
    return { status: "success", assignments: await listAssignments(accessToken, userId) };
  } catch (error) {
    return failure(error, "ไม่สามารถแก้ไขแผนกหรือ role ได้");
  }
}

export async function performRemoveAssignment(
  accessToken: string,
  userId: string,
  assignmentId: string,
): Promise<AssignmentsActionResult> {
  try {
    await deleteAssignment(accessToken, userId, assignmentId);
    return { status: "success", assignments: await listAssignments(accessToken, userId) };
  } catch (error) {
    return failure(error, "ไม่สามารถถอดแผนกออกได้");
  }
}

export async function createUserAction(payload: CreateUserPayload) {
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  return performCreateUser(token, payload);
}

export async function updateUserAction(id: string, payload: UpdateUserPayload) {
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  return performUpdateUser(token, id, payload);
}

export async function setUserStatusAction(id: string, isActive: boolean) {
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  return performSetUserStatus(token, id, isActive);
}

export async function resetPasswordAction(id: string, newPassword: string) {
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  return performResetPassword(token, id, newPassword);
}

export async function deleteUserAction(id: string) {
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  return performDeleteUser(token, id);
}

export async function listAssignmentsAction(userId: string) {
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  return performListAssignments(token, userId);
}

export async function addAssignmentAction(userId: string, payload: AssignmentPayload) {
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  return performAddAssignment(token, userId, payload);
}

export async function updateAssignmentAction(
  userId: string,
  assignmentId: string,
  payload: AssignmentPayload,
) {
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  return performUpdateAssignment(token, userId, assignmentId, payload);
}

export async function removeAssignmentAction(userId: string, assignmentId: string) {
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  return performRemoveAssignment(token, userId, assignmentId);
}
