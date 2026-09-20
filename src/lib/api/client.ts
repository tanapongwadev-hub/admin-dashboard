// Server-only: reads process.env.API_* directly, so only call these
// from Server Components, Route Handlers, or Server Actions.

import { ApiError } from "./api-error";
export { ApiError } from "./api-error";

function baseUrl() {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error(
      "API_BASE_URL is not set. Copy .env.local.example to .env.local and fill it in."
    );
  }
  return url.replace(/\/$/, "");
}

type Recovery = string | { accessToken: string; commit: () => Promise<void> };
type RecoverToken = (accessToken: string) => Promise<Recovery | null>;

export function createApiFetch(recover: RecoverToken) {
  return async function request<T>(
    path: string,
    init?: RequestInit,
    retried = false,
  ): Promise<T> {
    const isFormData = init?.body instanceof FormData;
    const headers = new Headers(init?.headers);
    if (!isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (!headers.has("Authorization") && process.env.API_AUTH_TOKEN) {
      headers.set("Authorization", `Bearer ${process.env.API_AUTH_TOKEN}`);
    }
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      cache: "no-store",
      headers,
    });
  
    if (!res.ok) {
      let body: unknown = undefined;
      try {
        body = await res.json();
      } catch {
        // response had no JSON body
      }
      const error = new ApiError(
        `API request failed: ${init?.method ?? "GET"} ${path} → ${res.status}`,
        res.status,
        body
      );
      const bearer = headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
      const excluded = /^\/auth\/(login|select-department|refresh(?:-token)?|logout(?:-refresh)?)(?:\?|$)/.test(path);
      if (!retried && !excluded && bearer && error.status === 401 && error.code === "ACCESS_TOKEN_EXPIRED") {
        const recovery = await recover(bearer);
        if (recovery) {
          const token = typeof recovery === "string" ? recovery : recovery.accessToken;
          headers.set("Authorization", `Bearer ${token}`);
          let result: T;
          try {
            result = await request<T>(path, { ...init, headers }, true);
          } catch (error) {
            // A second 401 terminates before an RSC recovery redirect, avoiding
            // a redirect/refresh loop when fresh access credentials fail too.
            if (!(error instanceof ApiError && error.status === 401) && typeof recovery !== "string") {
              await recovery.commit();
            }
            throw error;
          }
          if (typeof recovery !== "string") await recovery.commit();
          return result;
        }
        throw new ApiError("Authentication session is missing", 401, { code: "SESSION_EXPIRED" });
      }
      if (retried && error.status === 401) {
        throw new ApiError(error.message, 401, { code: "SESSION_REVOKED" });
      }
      throw error;
    }
  
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  };
}

export const apiFetch = createApiFetch(async (token) => {
  const { recoverAccessToken } = await import("../auth-recovery");
  return recoverAccessToken(token);
});
