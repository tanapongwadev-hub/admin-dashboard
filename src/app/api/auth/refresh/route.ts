import { NextRequest, NextResponse } from "next/server";
import { isTerminalAuthError, refreshSession } from "@/lib/auth-refresh";
import { needsRefresh, safeReturnPath, sessionCookieEntries, tokenExpiresAt } from "@/lib/auth-tokens";

async function recover(request: NextRequest, navigate: boolean) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  // GET is reserved for same-origin RSC recovery. POST supports timer refresh.
  if ((origin && origin !== request.nextUrl.origin) ||
      (site && site !== "same-origin" && site !== "none") ||
      (!navigate && !origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const token = request.cookies.get("refreshToken")?.value;
  const failed = () => {
    const response = navigate
      ? NextResponse.redirect(new URL("/login", request.url), 303)
      : NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 401 });
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  if (!token) return failed();
  const accessToken = request.cookies.get("accessToken")?.value;
  if (!navigate && !needsRefresh(accessToken)) {
    return NextResponse.json({ expiresAt: tokenExpiresAt(accessToken) }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  try {
    const tokens = await refreshSession(token);
    const response = navigate
      ? NextResponse.redirect(new URL(safeReturnPath(request.nextUrl.searchParams.get("next")), request.url), 303)
      : NextResponse.json({ expiresAt: tokenExpiresAt(tokens.accessToken) });
    for (const cookie of sessionCookieEntries(tokens)) response.cookies.set(cookie);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (isTerminalAuthError(error)) return failed();
    return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, {
      status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" },
    });
  }
}

export function GET(request: NextRequest) { return recover(request, true); }
export function POST(request: NextRequest) { return recover(request, false); }
