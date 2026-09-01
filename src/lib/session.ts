import { cache } from "react";
import { cookies } from "next/headers";
import { getMe, type AuthenticatedUser, type CurrentDepartmentRole } from "./api/auth";
import { ApiError } from "./api/client";

export interface CurrentSession {
  user: AuthenticatedUser;
  currentDepartmentRole: CurrentDepartmentRole | null;
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
      };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        return null;
      }
      throw err;
    }
  }
);
