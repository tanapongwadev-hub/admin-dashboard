import { cache } from "react";
import { cookies } from "next/headers";
import {
  getMe,
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
//
// **Cookie mutation moved to a Route Handler**: an earlier version of
// this function called `store.delete("accessToken")` / `store.delete("refreshToken")`
// when `/auth/me` returned 401, then redirected to /login. That broke in
// Next.js 15+ because `cookies()` is read-only in Server Components
// (where this function is called from) — only writable inside a Server
// Action or Route Handler. Trying to mutate here raises
// `Cookies can only be modified in a Server Action or Route Handler` and
// the response becomes a 500 (instead of a clean 401 → /login redirect).
//
// The new flow: this function only *detects* the 401 and returns null. The
// dashboard layout sees null and `redirect("/login")` — that redirect
// is a plain server-side redirect, no cookie work. The actual cookie
// cleanup happens in a separate Route Handler (currently
// `app/(dashboard)/api/auth/clear-cookies/route.ts`, which the /login
// page can fetch on mount or which we can call from a Server Action
// during login) — keeping cookie writes in the one place Next.js allows.
//
// 403: token is valid but the action is denied (usually a permission
// gate). Don't touch the cookies — the user is still authenticated.
// Returning null still makes the dashboard layout redirect to /login
// (pre-existing behavior, unchanged) so the user re-authenticates
// cleanly; the cookies stay so a successful re-auth picks up where the
// previous session left off.
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
      return null;
    }
  }
);
