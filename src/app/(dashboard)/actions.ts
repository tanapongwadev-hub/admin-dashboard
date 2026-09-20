"use server";

import { cookies } from "next/headers";
import { logout, logoutWithRefreshToken } from "@/lib/api/auth";

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
