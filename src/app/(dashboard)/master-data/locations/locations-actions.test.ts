// Tests for the Server Actions in `actions.ts` — the actual CRUD layer
// for `/master-data/locations`. Same pattern as
// `master-data/material-types/material-types-actions.test.ts` and the
// earlier `categories-actions.test.ts` / `products-actions.test.ts`:
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

function makeLocationFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "loc-1",
    code: "LOC-A",
    nameTh: "คลัง A",
    nameEn: "Warehouse A",
    zone: "Zone-1",
    warehouse: "WH-A",
    description: "คลังหลัก",
    isActive: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

function makeCreatePayload() {
  return {
    code: "LOC-A",
    nameTh: "คลัง A",
    nameEn: "Warehouse A",
  };
}

function makeUpdatePayload() {
  return { nameTh: "คลัง A (แก้ไข)", updatedAt: "2026-09-21T00:00:00.000Z" };
}

// ---------------------------------------------------------------------------
// performCreateLocation
// ---------------------------------------------------------------------------

test("performCreateLocation POSTs to /locations and revalidates the list path on 200", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeLocationFixture());
  });

  const { performCreateLocation } = await import("./actions");
  const result = await performCreateLocation("test-token", makeCreatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/locations");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
});

test("performCreateLocation returns 'conflict' on 409 (duplicate code)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "Location code already exists" }));

  const { performCreateLocation } = await import("./actions");
  const result = await performCreateLocation("test-token", makeCreatePayload());

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่นแล้ว/);
});

test("performCreateLocation returns the joined API error message on non-2xx", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(500, { message: ["DB error", "Timeout"] }));

  const { performCreateLocation } = await import("./actions");
  const result = await performCreateLocation("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.match((result as { message: string }).message, /DB error, Timeout/);
});

test("performCreateLocation returns a Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("ECONNREFUSED"); });

  const { performCreateLocation } = await import("./actions");
  const result = await performCreateLocation("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// performUpdateLocation
// ---------------------------------------------------------------------------

test("performUpdateLocation PATCHes /locations/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLocationFixture({ nameTh: "คลัง A (แก้ไข)" }));
  });

  const { performUpdateLocation } = await import("./actions");
  const result = await performUpdateLocation("test-token", "loc-1", makeUpdatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/locations/loc-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "คลัง A (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-21T00:00:00.000Z");
});

test("performUpdateLocation returns 'conflict' on 409 (stale updatedAt)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "stale" }));

  const { performUpdateLocation } = await import("./actions");
  const result = await performUpdateLocation("test-token", "loc-1", makeUpdatePayload());

  assert.equal(result.status, "conflict");
});

// ---------------------------------------------------------------------------
// performDeactivateLocation / performRestoreLocation (soft delete)
// ---------------------------------------------------------------------------

test("performDeactivateLocation DELETEs /locations/{id} and returns the deactivated location", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLocationFixture({ isActive: false }));
  });

  const { performDeactivateLocation } = await import("./actions");
  const result = await performDeactivateLocation("test-token", "loc-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/locations/loc-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal((result as { location: { isActive: boolean } }).location.isActive, false);
});

test("performRestoreLocation PATCHes /locations/{id}/restore and returns the reactivated location", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLocationFixture({ isActive: true }));
  });

  const { performRestoreLocation } = await import("./actions");
  const result = await performRestoreLocation("test-token", "loc-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/locations/loc-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal((result as { location: { isActive: boolean } }).location.isActive, true);
});

// ---------------------------------------------------------------------------
// Public wrappers
// ---------------------------------------------------------------------------

test("all public Location action wrappers forward to their perform* helpers", async (t) => {
  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    fetchCount++;
    const url = String(input);
    if (init?.method === "POST") return jsonResponse(201, makeLocationFixture());
    if (init?.method === "PATCH" && url.endsWith("/restore")) return jsonResponse(200, makeLocationFixture({ isActive: true }));
    if (init?.method === "PATCH") return jsonResponse(200, makeLocationFixture({ nameTh: "x" }));
    if (init?.method === "DELETE") return jsonResponse(200, makeLocationFixture({ isActive: false }));
    return jsonResponse(200, makeLocationFixture());
  });

  const {
    createLocationAction,
    updateLocationAction,
    deactivateLocationAction,
    restoreLocationAction,
  } = await import("./actions");

  await assert.rejects(() => createLocationAction(makeCreatePayload()));
  await assert.rejects(() => updateLocationAction("loc-1", makeUpdatePayload()));
  await assert.rejects(() => deactivateLocationAction("loc-1"));
  await assert.rejects(() => restoreLocationAction("loc-1"));

  assert.equal(fetchCount, 0, "fetch must not be called when access token is missing");
});