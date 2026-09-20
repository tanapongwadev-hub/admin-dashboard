import { NextRequest, NextResponse } from "next/server";
import { isTerminalAuthError, refreshSession } from "@/lib/auth-refresh";
import { needsRefresh, sessionCookieEntries } from "@/lib/auth-tokens";

export async function proxy(request: NextRequest) {
  const incoming = new Headers(request.headers);
  // Always overwrite this routing hint; never trust a caller-supplied value.
  incoming.set("x-auth-return-path", request.nextUrl.pathname + request.nextUrl.search);
  const pass = () => NextResponse.next({ request: { headers: incoming } });
  if (/^\/(?:login|register|forgot-password|api\/auth)(?:\/|$)/.test(request.nextUrl.pathname)) return pass();
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const accessToken = request.cookies.get("accessToken")?.value;
  if (!refreshToken || !needsRefresh(accessToken)) return pass();
  // Do not rotate cookies for a cross-site mutation. Next also checks Action origins.
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      (origin && origin !== request.nextUrl.origin)) return pass();
  try {
    const tokens = await refreshSession(refreshToken);
    const entries = sessionCookieEntries(tokens);
    for (const cookie of entries) request.cookies.set(cookie.name, cookie.value);
    incoming.set("cookie", request.cookies.toString());
    const response = pass();
    for (const cookie of entries) response.cookies.set(cookie);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (!isTerminalAuthError(error)) {
      // Keep credentials on network/5xx failure; do not let missing access
      // cookies fall through to the existing unauthenticated layout redirect.
      return new NextResponse("Authentication service temporarily unavailable. Please retry.", {
        status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" },
      });
    }
    const response = NextResponse.redirect(new URL("/login", request.url), 303);
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|uploads/|favicon.ico|.*\\.(?:png|jpg|svg|css|js)$).*)"],
};
