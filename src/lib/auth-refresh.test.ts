import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, createApiFetch } from "./api/client";
import { createRefreshCoordinator, isTerminalAuthError } from "./auth-refresh";
import { needsRefresh, safeReturnPath, sessionCookieEntries } from "./auth-tokens";

const jwt = (exp: number) => `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.signature`;

test("valid access token returns 200 without refresh", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ ok: true }));
  const before = process.env.API_BASE_URL;
  process.env.API_BASE_URL = "https://api.test";
  t.after(() => { if (before === undefined) delete process.env.API_BASE_URL; else process.env.API_BASE_URL = before; });
  const api = createApiFetch(async () => { throw new Error("Unexpected refresh"); });
  assert.deepEqual(await api("/resource"), { ok: true });
});

test("ten expired requests share one refresh and retry original POST bodies", async (t) => {
  const before = process.env.API_BASE_URL;
  process.env.API_BASE_URL = "https://api.test";
  t.after(() => { if (before === undefined) delete process.env.API_BASE_URL; else process.env.API_BASE_URL = before; });
  let refreshes = 0;
  let retries = 0;
  const refresh = createRefreshCoordinator(async () => {
    refreshes++;
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    return { accessToken: "new-access", refreshToken: "new-refresh" };
  });
  const api = createApiFetch(async () => (await refresh("shared-refresh")).accessToken);
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, '{"quantity":3}');
    if (new Headers(init?.headers).get("Authorization") === "Bearer old-access") {
      return Response.json({ code: "ACCESS_TOKEN_EXPIRED" }, { status: 401 });
    }
    retries++;
    return Response.json({ ok: true });
  });
  const results = await Promise.all(Array.from({ length: 10 }, () => api("/resource", {
    method: "POST", body: '{"quantity":3}', headers: { Authorization: "Bearer old-access" },
  })));
  assert.equal(refreshes, 1);
  assert.equal(retries, 10);
  assert.ok(results.every((result) => (result as { ok: boolean }).ok));
});

for (const code of ["REFRESH_TOKEN_EXPIRED", "REFRESH_TOKEN_INVALID", "REFRESH_TOKEN_REVOKED"]) {
  test(`${code} is terminal with no retry loop`, async (t) => {
    const before = process.env.API_BASE_URL;
    process.env.API_BASE_URL = "https://api.test";
    t.after(() => { if (before === undefined) delete process.env.API_BASE_URL; else process.env.API_BASE_URL = before; });
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
      calls++;
      return Response.json({ code: "ACCESS_TOKEN_EXPIRED" }, { status: 401 });
    });
    let refreshes = 0;
    const api = createApiFetch(async () => {
      refreshes++;
      throw new ApiError("rejected", 401, { code });
    });
    await assert.rejects(api("/resource", { headers: { Authorization: "Bearer old" } }), isTerminalAuthError);
    assert.equal(calls, 1);
    assert.equal(refreshes, 1);
  });
}

test("retry 401 stops after one refresh; auth endpoints never refresh", async (t) => {
  const before = process.env.API_BASE_URL;
  process.env.API_BASE_URL = "https://api.test";
  t.after(() => { if (before === undefined) delete process.env.API_BASE_URL; else process.env.API_BASE_URL = before; });
  let refreshes = 0;
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return Response.json({ code: "ACCESS_TOKEN_EXPIRED" }, { status: 401 });
  });
  const api = createApiFetch(async () => { refreshes++; return "new"; });
  await assert.rejects(api("/resource", { headers: { Authorization: "Bearer old" } }), isTerminalAuthError);
  assert.equal(requests, 2);
  assert.equal(refreshes, 1);
  for (const path of ["/auth/login", "/auth/refresh", "/auth/refresh-token", "/auth/logout", "/auth/logout-refresh"]) {
    await assert.rejects(api(path, { headers: { Authorization: "Bearer old" } }));
  }
  assert.equal(refreshes, 1);
});

test("transient refresh failures preserve auth and can be retried", async () => {
  let attempts = 0;
  const refresh = createRefreshCoordinator(async () => {
    if (++attempts === 1) throw new ApiError("unavailable", 503, {});
    return { accessToken: "new", refreshToken: "next" };
  });
  await assert.rejects(refresh("old"), (error) => !isTerminalAuthError(error));
  assert.equal((await refresh("old")).accessToken, "new");
  assert.equal(isTerminalAuthError(new ApiError("forbidden", 403, {})), false);
  assert.equal(isTerminalAuthError(new ApiError("expired", 401, { code: "ACCESS_TOKEN_EXPIRED" })), false);
});

test("fresh-token rejection does not commit an RSC recovery redirect", async (t) => {
  const before = process.env.API_BASE_URL;
  process.env.API_BASE_URL = "https://api.test";
  t.after(() => { if (before === undefined) delete process.env.API_BASE_URL; else process.env.API_BASE_URL = before; });
  let commits = 0;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ code: "ACCESS_TOKEN_EXPIRED" }, { status: 401 }));
  const api = createApiFetch(async () => ({
    accessToken: "fresh", commit: async () => { commits++; },
  }));
  await assert.rejects(api("/resource", { headers: { Authorization: "Bearer old" } }), isTerminalAuthError);
  assert.equal(commits, 0);
});

test("one hour of activity refreshes four times using expiry alone", async () => {
  let time = 0;
  let access = jwt(900);
  let refreshToken = "first";
  let refreshes = 0;
  const refresh = createRefreshCoordinator(async () => {
    refreshes++;
    return { accessToken: jwt(time / 1000 + 900), refreshToken: String(refreshes) };
  }, () => time);
  for (time = 0; time <= 3_600_000; time += 30_000) {
    if (needsRefresh(access, time)) {
      const tokens = await refresh(refreshToken);
      access = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    }
  }
  assert.equal(refreshes, 4);
});

test("cookies follow JWT lifetime, are HttpOnly, and return paths stay local", () => {
  const entries = sessionCookieEntries({ accessToken: jwt(900), refreshToken: jwt(604800) });
  assert.equal(entries[0].expires.getTime(), 900000);
  assert.equal(entries[1].expires.getTime(), 604800000);
  assert.ok(entries.every((entry) => entry.httpOnly && entry.sameSite === "lax" && entry.path === "/"));
  for (const path of ["//evil.test", "/\\evil.test", "/api/auth/refresh", "/x/../api/auth/refresh", "/\t/evil.test", "https://evil.test"]) {
    assert.equal(safeReturnPath(path), "/dashboard");
  }
  assert.equal(safeReturnPath("/products?page=2"), "/products?page=2");
});
