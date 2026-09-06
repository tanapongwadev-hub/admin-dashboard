import { cache } from "react";
import { cookies } from "next/headers";
import {
  getMe,
  logout,
  type AuthenticatedUser,
  type CurrentDepartmentRole,
  type MenuNode,
} from "./api/auth";
import { ApiError } from "./api/client";

export interface CurrentSession {
  user: AuthenticatedUser;
  currentDepartmentRole: CurrentDepartmentRole | null;
  // Already scoped server-side to the active role/assignment — see
  // cps-api/API_ENDPOINTS.md § 3 and § 12 (permission code matrix).
  menus: MenuNode[];
  permissions: string[];
}

// Wrapped in React.cache so every Server Component in a single request
// (layout + page, etc.) shares one /auth/me call instead of each firing
// its own — see cps-api/API_ENDPOINTS.md § 3.
export const getCurrentSession = cache(
  async (): Promise<CurrentSession | null> => {
    const store = await cookies();
    const accessToken = store.get("accessToken")?.value;
    if (!accessToken) return null;

    try {
      const me = await getMe(accessToken);
      return {
        user: me.data.user,
        currentDepartmentRole: me.data.currentDepartmentRole,
        menus: me.data.accessControl.menus,
        permissions: me.data.accessControl.permissions,
      };
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;

      // 401: token is invalid/expired/revoked. The user is effectively
      // logged out, so clean up the client-side cookies + best-effort
      // call /auth/logout to invalidate the server-side session. The
      // dashboard layout's redirect("/login") handles the user-visible
      // navigation. Without this, the next request would carry the same
      // stale token, get the same 401, and loop.
      //
      // 403: token is valid but the action is denied (usually a
      // permission gate). Don't touch the cookies — the user is still
      // authenticated. Returning null still makes the dashboard layout
      // redirect to /login (pre-existing behavior, unchanged) so the
      // user re-authenticates cleanly; the cookies stay so a successful
      // re-auth picks up where the previous session left off.
      if (err.status === 401) {
        store.delete("accessToken");
        store.delete("refreshToken");
        try {
          await logout(accessToken);
        } catch {
          // Best-effort: cookies are already cleared regardless.
        }
      }
      return null;
    }
  }
);
