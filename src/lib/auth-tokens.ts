// Decoding is ONLY a scheduling hint. The API verifies signatures and session state.
export function tokenExpiresAt(token: string | undefined): number | null {
  if (!token) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (payload && typeof payload === "object" && "exp" in payload &&
        typeof payload.exp === "number" && Number.isFinite(payload.exp)) {
      return payload.exp * 1000;
    }
  } catch { /* malformed tokens are validated by the API */ }
  return null;
}

export function needsRefresh(token: string | undefined, now = Date.now()): boolean {
  const expires = tokenExpiresAt(token);
  return expires === null || expires <= now + 60_000;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export function sessionCookieEntries(tokens: SessionTokens) {
  return (["accessToken", "refreshToken"] as const).map((name) => {
    const expiresAt = tokenExpiresAt(tokens[name]);
    if (!expiresAt) throw new Error("Authentication response has no token expiration");
    return {
      name, value: tokens[name],
      httpOnly: true, secure: process.env.NODE_ENV !== "development",
      sameSite: "lax" as const, path: "/", expires: new Date(expiresAt),
    };
  });
}

export function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") ||
      /[\\\u0000-\u0020]/.test(raw)) return "/dashboard";
  const parsed = new URL(raw, "https://local.invalid");
  if (parsed.origin !== "https://local.invalid" || parsed.pathname.startsWith("/api/auth/")) {
    return "/dashboard";
  }
  return parsed.pathname + parsed.search;
}
