import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { POST } from "../app/api/auth/refresh/route";

const token = (exp: number, id: string) =>
  `header.${Buffer.from(JSON.stringify({ exp, jti: id })).toString("base64url")}.signature`;

test("expired access cookie recovers before server rendering and all tabs receive the same cookies", async (t) => {
  const before = process.env.API_BASE_URL;
  process.env.API_BASE_URL = "https://api.test";
  t.after(() => { if (before === undefined) delete process.env.API_BASE_URL; else process.env.API_BASE_URL = before; });
  const now = Math.floor(Date.now() / 1000);
  const accessToken = token(now + 900, "route-new-access");
  const refreshToken = token(now + 604800, "route-new-refresh");
  let requests = 0;
  t.mock.method(globalThis, "fetch", async (url: unknown) => {
    assert.equal(String(url), "https://api.test/auth/refresh");
    requests++;
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    return Response.json({ data: { authentication: { accessToken, refreshToken } } });
  });
  const results = await Promise.all(Array.from({ length: 10 }, () => proxy(new NextRequest(
    "https://dashboard.test/products",
    { headers: { cookie: `refreshToken=${token(now + 604800, "route-old")}`, "sec-fetch-site": "same-origin" } },
  ))));
  assert.equal(requests, 1);
  for (const response of results) {
    assert.equal(response.cookies.get("accessToken")?.value, accessToken);
    assert.equal(response.cookies.get("refreshToken")?.value, refreshToken);
    assert.match(response.headers.get("x-middleware-request-cookie") ?? "", /accessToken=/);
    assert.equal(response.headers.get("location"), null);
  }
});

test("refresh network failure preserves cookies instead of redirecting", async (t) => {
  const before = process.env.API_BASE_URL;
  process.env.API_BASE_URL = "https://api.test";
  t.after(() => { if (before === undefined) delete process.env.API_BASE_URL; else process.env.API_BASE_URL = before; });
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  const response = await proxy(new NextRequest("https://dashboard.test/products", {
    headers: { cookie: "refreshToken=network-failure-token" },
  }));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("location"), null);
});

for (const code of ["REFRESH_TOKEN_EXPIRED", "REFRESH_TOKEN_INVALID", "REFRESH_TOKEN_REVOKED"]) {
  test(`proxy clears cookies only for terminal ${code}`, async (t) => {
    const before = process.env.API_BASE_URL;
    process.env.API_BASE_URL = "https://api.test";
    t.after(() => { if (before === undefined) delete process.env.API_BASE_URL; else process.env.API_BASE_URL = before; });
    t.mock.method(globalThis, "fetch", async () => Response.json({ code }, { status: 401 }));
    const response = await proxy(new NextRequest("https://dashboard.test/products", {
      headers: { cookie: `refreshToken=${code}` },
    }));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "https://dashboard.test/login");
    assert.equal(response.cookies.get("refreshToken")?.value, "");
  });
}

test("refresh rejects cross-origin POST before contacting the API", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Must not fetch"); });
  const response = await POST(new NextRequest("https://dashboard.test/api/auth/refresh", {
    method: "POST", headers: { origin: "https://attacker.test", cookie: "refreshToken=secret" },
  }));
  assert.equal(response.status, 403);
});
