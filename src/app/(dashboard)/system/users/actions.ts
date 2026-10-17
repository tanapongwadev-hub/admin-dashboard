"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  createUser,
  deleteUser,
  resetUserPassword,
  updateUser,
  updateUserStatus,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserListItem,
} from "@/lib/api/users";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export type UserActionResult =
  | { status: "success"; user: UserListItem }
  | { status: "error"; message: string };

export type UserDoneResult = { status: "success" } | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function refresh() {
  // The overrides tab of /system/permissions lists the same users.
  try {
    revalidatePath("/system/users");
    revalidatePath("/system/permissions");
  } catch {
    /* best-effort */
  }
}

function failure(error: unknown, fallback: string): { status: "error"; message: string } {
  redirectIfSessionExpired(error);
  if (error instanceof ApiError) return { status: "error", message: apiErrorMessage(error, fallback) };
  return { status: "error", message: CONNECTION_ERROR_MESSAGE };
}

// `perform*` helpers take the token so tests can call them directly (same
// split as system/permissions/actions.ts).
export async function performCreateUser(
  accessToken: string,
  payload: CreateUserPayload,
): Promise<UserActionResult> {
  try {
    const user = await createUser(accessToken, payload);
    refresh();
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
    refresh();
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
    refresh();
    return { status: "success", user };
  } catch (error) {
    return failure(error, "ไม่สามารถเปลี่ยนสถานะผู้ใช้ได้");
  }
}

export async function performResetUserPassword(
  accessToken: string,
  id: string,
  newPassword: string,
): Promise<UserDoneResult> {
  try {
    await resetUserPassword(accessToken, id, newPassword);
    return { status: "success" };
  } catch (error) {
    return failure(error, "ไม่สามารถรีเซ็ตรหัสผ่านได้");
  }
}

export async function performDeleteUser(accessToken: string, id: string): Promise<UserDoneResult> {
  try {
    await deleteUser(accessToken, id);
    refresh();
    return { status: "success" };
  } catch (error) {
    return failure(error, "ไม่สามารถลบผู้ใช้ได้");
  }
}

export async function createUserAction(payload: CreateUserPayload): Promise<UserActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performCreateUser(accessToken, payload);
}

export async function updateUserAction(
  id: string,
  payload: UpdateUserPayload,
): Promise<UserActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performUpdateUser(accessToken, id, payload);
}

export async function setUserStatusAction(id: string, isActive: boolean): Promise<UserActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performSetUserStatus(accessToken, id, isActive);
}

export async function resetUserPasswordAction(id: string, newPassword: string): Promise<UserDoneResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performResetUserPassword(accessToken, id, newPassword);
}

export async function deleteUserAction(id: string): Promise<UserDoneResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performDeleteUser(accessToken, id);
}
