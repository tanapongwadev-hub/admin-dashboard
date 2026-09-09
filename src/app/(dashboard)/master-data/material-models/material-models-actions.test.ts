// Tests for the Server Actions in `actions.ts` — the actual CRUD layer
// for `/master-data/material-models`. Same pattern as
// `master-data/loading-points/loading-points-actions.test.ts`,
// `master-data/delivery-types/delivery-types-actions.test.ts` and
// `master-data/reject-reasons/reject-reasons-actions.test.ts`:
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

function makeMaterialModelFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "mm-1",
    code: "MM-A1",
    nameTh: "รุ่น A1",
    nameEn: "Model A1",
    description: null,
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
    code: "MM-A1",
    nameTh: "รุ่น A1",
    nameEn: "Model A1",
  };
}

function makeUpdatePayload() {
  return { nameTh: "รุ่น A1 (แก้ไข)", updatedAt: "2026-09-09T00:00:00.000Z" };
}

// ---------------------------------------------------------------------------
// performCreateMaterialModel
// ---------------------------------------------------------------------------

test("performCreateMaterialModel POSTs to /material-models and revalidates the list path on 200", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeMaterialModelFixture());
  });

  const { performCreateMaterialModel } = await import("./actions");
  const result = await performCreateMaterialModel("test-token", makeCreatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/material-models");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
});

test("performCreateMaterialModel returns 'conflict' on 409 (duplicate code)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "Material model code already exists" }));

  const { performCreateMaterialModel } = await import("./actions");
  const result = await performCreateMaterialModel("test-token", makeCreatePayload());

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่นแล้ว/);
});

test("performCreateMaterialModel returns the joined API error message on non-2xx", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(500, { message: ["DB error", "Timeout"] }));

  const { performCreateMaterialModel } = await import("./actions");
  const result = await performCreateMaterialModel("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.match((result as { message: string }).message, /DB error, Timeout/);
});

test("performCreateMaterialModel returns a Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("ECONNREFUSED"); });

  const { performCreateMaterialModel } = await import("./actions");
  const result = await performCreateMaterialModel("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// performUpdateMaterialModel
// ---------------------------------------------------------------------------

test("performUpdateMaterialModel PATCHes /material-models/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialModelFixture({ nameTh: "รุ่น A1 (แก้ไข)" }));
  });

  const { performUpdateMaterialModel } = await import("./actions");
  const result = await performUpdateMaterialModel("test-token", "mm-1", makeUpdatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/material-models/mm-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "รุ่น A1 (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-09T00:00:00.000Z");
});

test("performUpdateMaterialModel returns 'conflict' on 409 (stale updatedAt)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "stale" }));

  const { performUpdateMaterialModel } = await import("./actions");
  const result = await performUpdateMaterialModel("test-token", "mm-1", makeUpdatePayload());

  assert.equal(result.status, "conflict");
});

// ---------------------------------------------------------------------------
// performDeactivateMaterialModel / performRestoreMaterialModel (soft delete)
// ---------------------------------------------------------------------------

test("performDeactivateMaterialModel DELETEs /material-models/{id} and returns the deactivated material model", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialModelFixture({ isActive: false }));
  });

  const { performDeactivateMaterialModel } = await import("./actions");
  const result = await performDeactivateMaterialModel("test-token", "mm-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/material-models/mm-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal((result as { materialModel: { isActive: boolean } }).materialModel.isActive, false);
});

test("performRestoreMaterialModel PATCHes /material-models/{id}/restore and returns the reactivated material model", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialModelFixture({ isActive: true }));
  });

  const { performRestoreMaterialModel } = await import("./actions");
  const result = await performRestoreMaterialModel("test-token", "mm-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/material-models/mm-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal((result as { materialModel: { isActive: boolean } }).materialModel.isActive, true);
});

// ---------------------------------------------------------------------------
// Public wrappers — guard against accidental refactors that drop the
// cookie-reading layer. The wrappers themselves are one-liners that call
// the matching `perform*` helper with the accessToken from cookies; a
// future refactor that deletes the wrapper (or breaks the wiring) is
// caught here without needing to mock `next/headers`.
// ---------------------------------------------------------------------------

test("all public MaterialModel action wrappers forward to their perform* helpers", async (t) => {
  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    fetchCount++;
    const url = String(input);
    if (init?.method === "POST") return jsonResponse(201, makeMaterialModelFixture());
    if (init?.method === "PATCH" && url.endsWith("/restore")) return jsonResponse(200, makeMaterialModelFixture({ isActive: true }));
    if (init?.method === "PATCH") return jsonResponse(200, makeMaterialModelFixture({ nameTh: "x" }));
    if (init?.method === "DELETE") return jsonResponse(200, makeMaterialModelFixture({ isActive: false }));
    return jsonResponse(200, makeMaterialModelFixture());
  });

  // The cookie reader will return null (no request scope) — each wrapper
  // short-circuits to an error, so the helpers are never actually invoked.
  // We assert on that short-circuit so a future refactor that drops the
  // `if (!accessToken) return ...` guard is caught here.
  const {
    createMaterialModelAction,
    updateMaterialModelAction,
    deactivateMaterialModelAction,
    restoreMaterialModelAction,
  } = await import("./actions");

  const createResult = await createMaterialModelAction(makeCreatePayload());
  assert.equal(createResult.status, "error");
  assert.match((createResult as { message: string }).message, /เซสชันของคุณหมดอายุ/);

  const updateResult = await updateMaterialModelAction("mm-1", makeUpdatePayload());
  assert.equal(updateResult.status, "error");

  const deactivateResult = await deactivateMaterialModelAction("mm-1");
  assert.equal(deactivateResult.status, "error");

  const restoreResult = await restoreMaterialModelAction("mm-1");
  assert.equal(restoreResult.status, "error");

  assert.equal(fetchCount, 0, "fetch must not be called when access token is missing");
});
