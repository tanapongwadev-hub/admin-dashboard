import { createHash } from "node:crypto";
import { ApiError } from "./api/api-error";
import { tokenExpiresAt, type SessionTokens } from "./auth-tokens";

const terminalCodes = new Set([
  "REFRESH_TOKEN_EXPIRED", "REFRESH_TOKEN_INVALID", "REFRESH_TOKEN_REVOKED",
  "SESSION_EXPIRED", "SESSION_REVOKED", "ACCOUNT_DISABLED",
  "ACCESS_TOKEN_INVALID", "PERMISSION_VERSION_CHANGED",
]);

export function isTerminalAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401 &&
    !!error.code && terminalCodes.has(error.code);
}

export function createRefreshCoordinator(
  refresh: (token: string) => Promise<SessionTokens>,
  now: () => number = Date.now,
) {
  const flights = new Map<string, { promise: Promise<SessionTokens>; until: number }>();
  return (token: string): Promise<SessionTokens> => {
    const time = now();
    for (const [key, entry] of flights) {
      if (entry.until <= time) flights.delete(key);
    }
    const key = createHash("sha256").update(token).digest("hex");
    const existing = flights.get(key);
    if (existing) return existing.promise;
    const promise = refresh(token);
    const entry = { promise, until: Infinity };
    entry.promise = promise.then((tokens) => {
      // Briefly coalesce late requests carrying the same pre-rotation cookie.
      entry.until = now() + 5_000;
      const cleanup = setTimeout(() => {
        if (flights.get(key) === entry) flights.delete(key);
      }, 5_000);
      cleanup.unref();
      return tokens;
    }, (error: unknown) => {
      flights.delete(key);
      throw error;
    });
    flights.set(key, entry);
    return entry.promise;
  };
}

export const refreshSession = createRefreshCoordinator(async (refreshToken) => {
  const base = process.env.API_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("API_BASE_URL is not set");
  const response = await fetch(`${base}/auth/refresh`, {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => undefined);
  if (!response.ok) throw new ApiError("Session refresh failed", response.status, body);
  const tokens = body?.data?.authentication;
  if (typeof tokens?.accessToken !== "string" || typeof tokens?.refreshToken !== "string" ||
      !tokenExpiresAt(tokens.accessToken) || !tokenExpiresAt(tokens.refreshToken)) {
    throw new Error("Invalid authentication response");
  }
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
});
