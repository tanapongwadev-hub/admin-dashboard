// Clears the auth cookies + redirects. The dashboard layout redirects to
// this route when `getCurrentSession()` returns null (the token came back
// 401 from /auth/me — i.e. the server-side session expired or was
// revoked). Next.js only allows `cookies()` writes from Server Actions or
// Route Handlers, so the cleanup has to happen here rather than in the
// layout's Server Component (where `getCurrentSession` is called from).
//
// The default redirect target is `/login`; the dashboard layout passes
// `?next=/login` explicitly so this Route Handler can be reused in the
// future (e.g. a "force sign out" admin tool that bounces through
// `/dashboard` first) without re-routing from a hard-coded path.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logout as apiLogout } from "@/lib/api/auth";

export async function GET(request: Request) {
  const store = await cookies();

  // 1. Drop the client-side cookies so the next request has no token and
  // `getCurrentSession` short-circuits to "no session" on the very first
  // `cookies().get("accessToken")` check (see the comment in
  // `src/lib/session.ts`). Without this, even after a successful redirect
  // to /login the next navigation back to /dashboard would carry the
  // same stale token, get the same 401, and bounce the user to /login
  // again — the loop this Route Handler is here to break.
  store.delete("accessToken");
  store.delete("refreshToken");

  // 2. Best-effort server-side invalidation. If the token is already
  // revoked/expired the API call will 401/404 — the try/catch keeps the
  // redirect going either way, since the client-side cookies are already
  // gone and the user's next request is a fresh re-auth.
  const accessToken = store.get("accessToken")?.value;
  if (accessToken) {
    try {
      await apiLogout(accessToken);
    } catch {
      // ignore — the local cookies are already cleared
    }
  }

  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/login";
  redirect(next);
}
