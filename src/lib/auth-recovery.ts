import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { refreshSession } from "./auth-refresh";
import { safeReturnPath, sessionCookieEntries } from "./auth-tokens";

// Server Actions can persist cookies and retry in place. RSC rendering cannot
// write response cookies, so it resumes via the same-origin recovery handler.
export async function recoverAccessToken(accessToken: string) {
  const store = await cookies();
  const current = store.get("accessToken")?.value;
  // Another API call in this same action may already have rotated the cookies.
  // Retry with the request's current cookie, never rotate the old pair again.
  if (current && current !== accessToken) return current;
  if (!current) return null;
  const refreshToken = store.get("refreshToken")?.value;
  if (!refreshToken) return null;
  const tokens = await refreshSession(refreshToken);
  return {
    accessToken: tokens.accessToken,
    async commit() {
      try {
        for (const cookie of sessionCookieEntries(tokens)) store.set(cookie);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("Cookies can only be modified")) throw error;
        const path = safeReturnPath((await headers()).get("x-auth-return-path"));
        redirect(`/api/auth/refresh?next=${encodeURIComponent(path)}`);
      }
    },
  };
}
