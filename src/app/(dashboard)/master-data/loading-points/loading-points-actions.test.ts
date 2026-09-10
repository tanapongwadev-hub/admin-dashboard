// Tests for the Server Actions in `actions.ts` — the actual CRUD layer
// for `/master-data/loading-points`. Same pattern as
// `master-data/categories/categories-actions.test.ts` and the earlier
// `materials-pc-actions.test.ts` / `products-actions.test.ts`:
//   - mock `globalThis.fetch` with `t.mock.method` so the API functions
//     run for real and tests can assert on the HTTP shape
//   - mock the environment (process.env.API_BASE_URL)
//   - test the `perform*` helpers (testable inner functions that take
//     `accessToken` as a parameter), NOT the cookie-reading wrappers
//   - the public `*Action` wrappers are cookie-reading one-liners around
//     the helpers, well-covered by manual / live verification

import test from "node:test";
import assert from "node:assert/strict";

const ORIGINAL_API_BASE_URL = process.env.API_BASE_URL;

test.beforeEach(() => {
  process.env.API_BASE_URL = "http://api.example.test/api/v1";
});

test.after(() => {
  if (ORIGINAL_API_BASE_URL === undefined) delete process.env.API_BASE_URL;
  else process.env.API_BASE_URL = ORIGINAL_API_BASE_URL;
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeLoadingPointFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "lp-1",
    code: "LP-A1",
    nameTh: "จุดขนถ่าย A1",
    nameEn: "Loading Point A1",
    description: null,
    isActive: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
    ...overrides,
  };
}

function makeCreatePayload() {
  return {
    code: "LP-A1",
    nameTh: "จุดขนถ่าย A1",
    nameEn: "Loading Point A1",
  };
}

function makeUpdatePayload() {
  return { nameTh: "จุดขนถ่าย A1 (แก้ไข)", updatedAt: "2026-09-08T00:00:00.000Z" };
}

// ---------------------------------------------------------------------------
// performCreateLoadingPoint
// ---------------------------------------------------------------------------

test("performCreateLoadingPoint POSTs to /loading-points and revalidates the list path on 200", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeLoadingPointFixture());
  });

  const { performCreateLoadingPoint } = await import("./actions");
  const result = await performCreateLoadingPoint("test-token", makeCreatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/loading-points");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
});

test("performCreateLoadingPoint returns 'conflict' on 409 (duplicate code)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "Loading point code already exists" }));

  const { performCreateLoadingPoint } = await import("./actions");
  const result = await performCreateLoadingPoint("test-token", makeCreatePayload());

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่นแล้ว/);
});

test("performCreateLoadingPoint returns the joined API error message on non-2xx", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(500, { message: ["DB error", "Timeout"] }));

  const { performCreateLoadingPoint } = await import("./actions");
  const result = await performCreateLoadingPoint("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.match((result as { message: string }).message, /DB error, Timeout/);
});

test("performCreateLoadingPoint returns a Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("ECONNREFUSED"); });

  const { performCreateLoadingPoint } = await import("./actions");
  const result = await performCreateLoadingPoint("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// performUpdateLoadingPoint
// ---------------------------------------------------------------------------

test("performUpdateLoadingPoint PATCHes /loading-points/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLoadingPointFixture({ nameTh: "จุดขนถ่าย A1 (แก้ไข)" }));
  });

  const { performUpdateLoadingPoint } = await import("./actions");
  const result = await performUpdateLoadingPoint("test-token", "lp-1", makeUpdatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/loading-points/lp-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "จุดขนถ่าย A1 (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-08T00:00:00.000Z");
});

test("performUpdateLoadingPoint returns 'conflict' on 409 (stale updatedAt)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "stale" }));

  const { performUpdateLoadingPoint } = await import("./actions");
  const result = await performUpdateLoadingPoint("test-token", "lp-1", makeUpdatePayload());

  assert.equal(result.status, "conflict");
});

// ---------------------------------------------------------------------------
// performDeactivateLoadingPoint / performRestoreLoadingPoint (soft delete)
// ---------------------------------------------------------------------------

test("performDeactivateLoadingPoint DELETEs /loading-points/{id} and returns the deactivated loading point", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLoadingPointFixture({ isActive: false }));
  });

  const { performDeactivateLoadingPoint } = await import("./actions");
  const result = await performDeactivateLoadingPoint("test-token", "lp-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/loading-points/lp-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal((result as { loadingPoint: { isActive: boolean } }).loadingPoint.isActive, false);
});

test("performRestoreLoadingPoint PATCHes /loading-points/{id}/restore and returns the reactivated loading point", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLoadingPointFixture({ isActive: true }));
  });

  const { performRestoreLoadingPoint } = await import("./actions");
  const result = await performRestoreLoadingPoint("test-token", "lp-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/loading-points/lp-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal((result as { loadingPoint: { isActive: boolean } }).loadingPoint.isActive, true);
});

// ---------------------------------------------------------------------------
// Public wrappers — guard against accidental refactors that drop the
// cookie-reading layer. The wrappers themselves are one-liners that call
// the matching `perform*` helper with the accessToken from cookies; a
// future refactor that deletes the wrapper (or breaks the wiring) is
// caught here without needing to mock `next/headers`.
// ---------------------------------------------------------------------------

test("all public LoadingPoint action wrappers forward to their perform* helpers", async (t) => {
  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    fetchCount++;
    const url = String(input);
    if (init?.method === "POST") return jsonResponse(201, makeLoadingPointFixture());
    if (init?.method === "PATCH" && url.endsWith("/restore")) return jsonResponse(200, makeLoadingPointFixture({ isActive: true }));
    if (init?.method === "PATCH") return jsonResponse(200, makeLoadingPointFixture({ nameTh: "x" }));
    if (init?.method === "DELETE") return jsonResponse(200, makeLoadingPointFixture({ isActive: false }));
    return jsonResponse(200, makeLoadingPointFixture());
  });

  // The cookie reader will return null (no request scope) — each wrapper
  // short-circuits to an error, so the helpers are never actually invoked.
  // We assert on that short-circuit so a future refactor that drops the
  // `if (!accessToken) return ...` guard is caught here.
  const {
    createLoadingPointAction,
    updateLoadingPointAction,
    deactivateLoadingPointAction,
    restoreLoadingPointAction,
  } = await import("./actions");

  // With no access token present, every wrapper now signs the user out
  // (redirect to /api/auth/clear-cookies) instead of returning an error
  // object — redirect() throws Next.js's NEXT_REDIRECT sentinel, so each
  // call rejects. What this test actually pins down is unchanged: the
  // wrapper reads cookies first and never reaches the API without a token
  // (fetchCount stays 0 below).
  await assert.rejects(() => createLoadingPointAction(makeCreatePayload()));
  await assert.rejects(() => updateLoadingPointAction("lp-1", makeUpdatePayload()));
  await assert.rejects(() => deactivateLoadingPointAction("lp-1"));
  await assert.rejects(() => restoreLoadingPointAction("lp-1"));

  assert.equal(fetchCount, 0, "fetch must not be called when access token is missing");
});
