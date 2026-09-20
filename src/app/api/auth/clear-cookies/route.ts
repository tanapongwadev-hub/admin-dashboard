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
import { logout as apiLogout, logoutWithRefreshToken } from "@/lib/api/auth";

// `?next=` is attacker-controllable (anyone can hand a user a link to this
// route), so it must never be able to send the browser off-site — a
// same-origin path only, exactly the guard `lib/nav.ts#menuHref()` already
// applies to backend-supplied menu paths. `//evil.example` is a
// protocol-relative URL that `redirect()` would happily follow, so a
// leading `/` alone is not enough: reject a second slash too.
function safeNextPath(raw: string | null): string {
  if (!raw || !/^\/(?!\/)/.test(raw) || /[\\\u0000-\u0020]/.test(raw)) return "/login";
  const parsed = new URL(raw, "https://local.invalid");
  if (parsed.origin !== "https://local.invalid" || parsed.pathname.startsWith("/api/auth/")) return "/login";
  return parsed.pathname + parsed.search;
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if ((site && site !== "same-origin" && site !== "none") ||
      (origin && origin !== new URL(request.url).origin)) {
    return new Response("Forbidden", { status: 403 });
  }
  const store = await cookies();

  // 1. Read the token *before* clearing anything — this used to run after
  // the `delete()` calls below, so `accessToken` was always `undefined`
  // and the server-side logout never actually fired. The cps-api session
  // stayed alive until it expired on its own, even though the user had
  // been bounced to /login.
  const accessToken = store.get("accessToken")?.value;
  const refreshToken = store.get("refreshToken")?.value;

  // 2. Drop the client-side cookies so the next request has no token and
  // `getCurrentSession` short-circuits to "no session" on the very first
  // `cookies().get("accessToken")` check (see the comment in
  // `src/lib/session.ts`). Without this, even after a successful redirect
  // to /login the next navigation back to /dashboard would carry the
  // same stale token, get the same 401, and bounce the user to /login
  // again — the loop this Route Handler is here to break.
  store.delete("accessToken");
  store.delete("refreshToken");

  // 3. Best-effort server-side invalidation. If the token is already
  // revoked/expired the API call will 401/404 — the try/catch keeps the
  // redirect going either way, since the client-side cookies are already
  // gone and the user's next request is a fresh re-auth.
  if (refreshToken || accessToken) {
    try {
      if (refreshToken) await logoutWithRefreshToken(refreshToken);
      else if (accessToken) await apiLogout(accessToken);
    } catch {
      // ignore — the local cookies are already cleared
    }
  }

  redirect(safeNextPath(new URL(request.url).searchParams.get("next")));
}
