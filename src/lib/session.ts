import { cache } from "react";
import { cookies } from "next/headers";
import {
  getMe,
  type AuthenticatedUser,
  type CurrentDepartmentRole,
  type MenuNode,
} from "./api/auth";
import { isTerminalAuthError } from "./auth-refresh";

export interface CurrentSession {
  user: AuthenticatedUser;
  currentDepartmentRole: CurrentDepartmentRole | null;
  // Already scoped server-side to the active role/assignment — see
  // cps-api/API_ENDPOINTS.md § 3 and § 12 (permission code matrix).
  menus: MenuNode[];
  permissions: string[];
}

// One /auth/me call per server render. Proxy handles missing/near-expiry
// access cookies; apiFetch handles reactive expiry and retries once. Only
// explicit terminal auth failures become no-session; 403/5xx propagate.
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
      if (isTerminalAuthError(err)) {
        return null;
      }
      throw err;
    }
  }
);
