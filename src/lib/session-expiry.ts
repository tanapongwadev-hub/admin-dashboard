import { redirect } from "next/navigation";
import { ApiError } from "./api/client";

// Shared "the session died mid-action" guard for Server Actions.
//
// Background: `getCurrentSession()` + the dashboard layout only catch an
// expired session on a *page load*. A user sitting on an already-rendered
// page whose token expires underneath them would keep hitting Save and
// keep getting a plain red toast ("Unauthorized") forever — every action
// file's `errorResult()` turned a 401 into an ordinary error message, so
// nothing ever moved them to /login. Call this at the top of that error
// mapping instead, and an expired session now signs them out immediately.
//
// Why redirect through the Route Handler instead of clearing cookies
// here: `cookies().delete()` *is* allowed in a Server Action, but that
// would need this helper (and therefore every caller's `errorResult`) to
// become async. `redirect()` is synchronous, so bouncing through
// `/api/auth/clear-cookies` — which already drops both cookies and
// best-effort invalidates the session server-side — keeps every existing
// `errorResult(err)` call site unchanged.
//
// `redirect()` works by throwing a `NEXT_REDIRECT` sentinel that Next.js
// catches at the framework boundary. That's exactly why this must NOT be
// called from inside another try/catch that swallows unknown errors —
// every current call site invokes it from a `catch (err)` block whose
// only job is to map the error, so the sentinel propagates correctly.
//
// 403 is deliberately NOT treated as an expired session: the token is
// still valid, the user simply lacks a permission for that one action.
// Signing them out of the whole app for a single denied button would be
// wrong — that stays an ordinary error message.
export function redirectIfSessionExpired(err: unknown): void {
  if (err instanceof ApiError && err.status === 401) {
    redirect("/api/auth/clear-cookies?next=/login");
  }
}

// Same intent for the "no cookie at all" branch every action already has
// (`requireAccessToken()` returning null). Those currently return a
// "session expired, please sign in again" *message* and leave the user
// stranded on the page; this signs them out for real.
export function redirectMissingSession(): never {
  redirect("/api/auth/clear-cookies?next=/login");
}
