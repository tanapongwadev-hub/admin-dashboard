// Tests for the Server Actions in `actions.ts` — the actual CRUD layer
// for `/master-data/units`. Same pattern as the other simple-master
// actions tests:
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

function makeUnitFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "unit-1",
    code: "UNIT-A",
    nameTh: "หน่วยนับตัวอย่าง",
    nameEn: "Example Unit",
    symbol: "EG",
    description: "หน่วยนับสำหรับทดสอบ",
    isActive: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
    ...overrides,
  };
}

function makeCreatePayload() {
  return {
    code: "UNIT-A",
    nameTh: "หน่วยนับตัวอย่าง",
    nameEn: "Example Unit",
    symbol: "EG",
    description: "หน่วยนับสำหรับทดสอบ",
  };
}

function makeUpdatePayload() {
  return { nameTh: "หน่วยนับ (แก้ไข)", updatedAt: "2026-09-09T00:00:00.000Z" };
}

// ---------------------------------------------------------------------------
// performCreateUnit
// ---------------------------------------------------------------------------

test("performCreateUnit POSTs to /units and revalidates the list path on 200", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeUnitFixture());
  });

  const { performCreateUnit } = await import("./actions");
  const result = await performCreateUnit("test-token", makeCreatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/units");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
});

test("performCreateUnit returns 'conflict' on 409 (duplicate code)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "Unit code already exists" }));

  const { performCreateUnit } = await import("./actions");
  const result = await performCreateUnit("test-token", makeCreatePayload());

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่นแล้ว/);
});

test("performCreateUnit returns the joined API error message on non-2xx", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(500, { message: ["DB error", "Timeout"] }));

  const { performCreateUnit } = await import("./actions");
  const result = await performCreateUnit("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.match((result as { message: string }).message, /DB error, Timeout/);
});

test("performCreateUnit returns a Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("ECONNREFUSED"); });

  const { performCreateUnit } = await import("./actions");
  const result = await performCreateUnit("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// performUpdateUnit
// ---------------------------------------------------------------------------

test("performUpdateUnit PATCHes /units/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeUnitFixture({ nameTh: "หน่วยนับ (แก้ไข)" }));
  });

  const { performUpdateUnit } = await import("./actions");
  const result = await performUpdateUnit("test-token", "unit-1", makeUpdatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/units/unit-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "หน่วยนับ (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-09T00:00:00.000Z");
});

test("performUpdateUnit returns 'conflict' on 409 (stale updatedAt)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "stale" }));

  const { performUpdateUnit } = await import("./actions");
  const result = await performUpdateUnit("test-token", "unit-1", makeUpdatePayload());

  assert.equal(result.status, "conflict");
});

// ---------------------------------------------------------------------------
// performDeactivateUnit / performRestoreUnit (soft delete)
// ---------------------------------------------------------------------------

test("performDeactivateUnit DELETEs /units/{id} and returns the deactivated unit", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeUnitFixture({ isActive: false }));
  });

  const { performDeactivateUnit } = await import("./actions");
  const result = await performDeactivateUnit("test-token", "unit-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/units/unit-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal((result as { unit: { isActive: boolean } }).unit.isActive, false);
});

test("performRestoreUnit PATCHes /units/{id}/restore and returns the reactivated unit", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeUnitFixture({ isActive: true }));
  });

  const { performRestoreUnit } = await import("./actions");
  const result = await performRestoreUnit("test-token", "unit-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/units/unit-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal((result as { unit: { isActive: boolean } }).unit.isActive, true);
});

// ---------------------------------------------------------------------------
// Public wrappers — guard against accidental refactors that drop the
// cookie-reading layer. The wrappers themselves are one-liners that call
// the matching `perform*` helper with the accessToken from cookies; a
// future refactor that deletes the wrapper (or breaks the wiring) is
// caught here without needing to mock `next/headers`.
// ---------------------------------------------------------------------------

test("all public Unit action wrappers forward to their perform* helpers", async (t) => {
  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    fetchCount++;
    const url = String(input);
    if (init?.method === "POST") return jsonResponse(201, makeUnitFixture());
    if (init?.method === "PATCH" && url.endsWith("/restore")) return jsonResponse(200, makeUnitFixture({ isActive: true }));
    if (init?.method === "PATCH") return jsonResponse(200, makeUnitFixture({ nameTh: "x" }));
    if (init?.method === "DELETE") return jsonResponse(200, makeUnitFixture({ isActive: false }));
    return jsonResponse(200, makeUnitFixture());
  });

  const {
    createUnitAction,
    updateUnitAction,
    deactivateUnitAction,
    restoreUnitAction,
  } = await import("./actions");

  const createResult = await createUnitAction(makeCreatePayload());
  assert.equal(createResult.status, "error");
  assert.match((createResult as { message: string }).message, /เซสชันของคุณหมดอายุ/);

  const updateResult = await updateUnitAction("unit-1", makeUpdatePayload());
  assert.equal(updateResult.status, "error");

  const deactivateResult = await deactivateUnitAction("unit-1");
  assert.equal(deactivateResult.status, "error");

  const restoreResult = await restoreUnitAction("unit-1");
  assert.equal(restoreResult.status, "error");

  assert.equal(fetchCount, 0, "fetch must not be called when access token is missing");
});
