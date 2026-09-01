"use server";

import { cookies } from "next/headers";
import { logout } from "@/lib/api/auth";

export async function logoutAction() {
  const store = await cookies();
  const accessToken = store.get("accessToken")?.value;
  store.delete("accessToken");
  store.delete("refreshToken");

  if (accessToken) {
    try {
      await logout(accessToken);
    } catch {
      // Best-effort: cookies are already cleared regardless of API outcome.
    }
  }
}
