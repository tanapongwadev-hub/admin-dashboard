"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { sessionCookieEntries } from "@/lib/auth-tokens";
import { logout, logoutWithRefreshToken, switchDepartment } from "@/lib/api/auth";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

// Switch to another of the user's own departments without signing out: the API
// issues new tokens for that assignment and the cookies are replaced in place.
export async function switchDepartmentAction(userDepartmentRoleId: string) {
  const store = await cookies();
  const accessToken = store.get("accessToken")?.value;
  if (!accessToken) redirectMissingSession();
  try {
    const result = await switchDepartment(accessToken, userDepartmentRoleId);
    const { accessToken: nextAccess, refreshToken } = result.data.authentication;
    for (const cookie of sessionCookieEntries({ accessToken: nextAccess, refreshToken })) store.set(cookie);
    revalidatePath("/", "layout");
    return { status: "success" as const };
  } catch (error) {
    redirectIfSessionExpired(error);
    return {
      status: "error" as const,
      message: error instanceof ApiError ? apiErrorMessage(error, "ไม่สามารถสลับแผนกได้") : CONNECTION_ERROR_MESSAGE,
    };
  }
}

export async function logoutAction() {
  const store = await cookies();
  const accessToken = store.get("accessToken")?.value;
  const refreshToken = store.get("refreshToken")?.value;
  store.delete("accessToken");
  store.delete("refreshToken");

  if (refreshToken || accessToken) {
    try {
      if (refreshToken) await logoutWithRefreshToken(refreshToken);
      else if (accessToken) await logout(accessToken);
    } catch {
      // Best-effort: cookies are already cleared regardless of API outcome.
    }
  }
}
