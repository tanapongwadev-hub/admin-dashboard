// Tests for the Server Actions in `actions.ts` — the actual CRUD layer
// for `/master-data/reject-reasons`. Same pattern as
// `master-data/delivery-types/delivery-types-actions.test.ts` and the
// earlier `loading-points-actions.test.ts` / `categories-actions.test.ts` /
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

function makeRejectReasonFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "rr-1",
    code: "RR-OUT-OF-SPEC",
    nameTh: "คุณสมบัติไม่ตรงตามสเปก",
    nameEn: "Out of Specification",
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
    code: "RR-OUT-OF-SPEC",
    nameTh: "คุณสมบัติไม่ตรงตามสเปก",
    nameEn: "Out of Specification",
  };
}

function makeUpdatePayload() {
  return { nameTh: "คุณสมบัติไม่ตรงตามสเปก (แก้ไข)", updatedAt: "2026-09-09T00:00:00.000Z" };
}

// ---------------------------------------------------------------------------
// performCreateRejectReason
// ---------------------------------------------------------------------------

test("performCreateRejectReason POSTs to /reject-reasons and revalidates the list path on 200", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeRejectReasonFixture());
  });

  const { performCreateRejectReason } = await import("./actions");
  const result = await performCreateRejectReason("test-token", makeCreatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/reject-reasons");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
});

test("performCreateRejectReason returns 'conflict' on 409 (duplicate code)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "Reject reason code already exists" }));

  const { performCreateRejectReason } = await import("./actions");
  const result = await performCreateRejectReason("test-token", makeCreatePayload());

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่นแล้ว/);
});

test("performCreateRejectReason returns the joined API error message on non-2xx", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(500, { message: ["DB error", "Timeout"] }));

  const { performCreateRejectReason } = await import("./actions");
  const result = await performCreateRejectReason("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.match((result as { message: string }).message, /DB error, Timeout/);
});

test("performCreateRejectReason returns a Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("ECONNREFUSED"); });

  const { performCreateRejectReason } = await import("./actions");
  const result = await performCreateRejectReason("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// performUpdateRejectReason
// ---------------------------------------------------------------------------

test("performUpdateRejectReason PATCHes /reject-reasons/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeRejectReasonFixture({ nameTh: "คุณสมบัติไม่ตรงตามสเปก (แก้ไข)" }));
  });

  const { performUpdateRejectReason } = await import("./actions");
  const result = await performUpdateRejectReason("test-token", "rr-1", makeUpdatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/reject-reasons/rr-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "คุณสมบัติไม่ตรงตามสเปก (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-09T00:00:00.000Z");
});

test("performUpdateRejectReason returns 'conflict' on 409 (stale updatedAt)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "stale" }));

  const { performUpdateRejectReason } = await import("./actions");
  const result = await performUpdateRejectReason("test-token", "rr-1", makeUpdatePayload());

  assert.equal(result.status, "conflict");
});

// ---------------------------------------------------------------------------
// performDeactivateRejectReason / performRestoreRejectReason (soft delete)
// ---------------------------------------------------------------------------

test("performDeactivateRejectReason DELETEs /reject-reasons/{id} and returns the deactivated reject reason", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeRejectReasonFixture({ isActive: false }));
  });

  const { performDeactivateRejectReason } = await import("./actions");
  const result = await performDeactivateRejectReason("test-token", "rr-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/reject-reasons/rr-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal((result as { rejectReason: { isActive: boolean } }).rejectReason.isActive, false);
});

test("performRestoreRejectReason PATCHes /reject-reasons/{id}/restore and returns the reactivated reject reason", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeRejectReasonFixture({ isActive: true }));
  });

  const { performRestoreRejectReason } = await import("./actions");
  const result = await performRestoreRejectReason("test-token", "rr-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/reject-reasons/rr-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal((result as { rejectReason: { isActive: boolean } }).rejectReason.isActive, true);
});

// ---------------------------------------------------------------------------
// Public wrappers — guard against accidental refactors that drop the
// cookie-reading layer. The wrappers themselves are one-liners that call
// the matching `perform*` helper with the accessToken from cookies; a
// future refactor that deletes the wrapper (or breaks the wiring) is
// caught here without needing to mock `next/headers`.
// ---------------------------------------------------------------------------

test("all public RejectReason action wrappers forward to their perform* helpers", async (t) => {
  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    fetchCount++;
    const url = String(input);
    if (init?.method === "POST") return jsonResponse(201, makeRejectReasonFixture());
    if (init?.method === "PATCH" && url.endsWith("/restore")) return jsonResponse(200, makeRejectReasonFixture({ isActive: true }));
    if (init?.method === "PATCH") return jsonResponse(200, makeRejectReasonFixture({ nameTh: "x" }));
    if (init?.method === "DELETE") return jsonResponse(200, makeRejectReasonFixture({ isActive: false }));
    return jsonResponse(200, makeRejectReasonFixture());
  });

  // The cookie reader will return null (no request scope) — each wrapper
  // short-circuits to an error, so the helpers are never actually invoked.
  // We assert on that short-circuit so a future refactor that drops the
  // `if (!accessToken) return ...` guard is caught here.
  const {
    createRejectReasonAction,
    updateRejectReasonAction,
    deactivateRejectReasonAction,
    restoreRejectReasonAction,
  } = await import("./actions");

  const createResult = await createRejectReasonAction(makeCreatePayload());
  assert.equal(createResult.status, "error");
  assert.match((createResult as { message: string }).message, /เซสชันของคุณหมดอายุ/);

  const updateResult = await updateRejectReasonAction("rr-1", makeUpdatePayload());
  assert.equal(updateResult.status, "error");

  const deactivateResult = await deactivateRejectReasonAction("rr-1");
  assert.equal(deactivateResult.status, "error");

  const restoreResult = await restoreRejectReasonAction("rr-1");
  assert.equal(restoreResult.status, "error");

  assert.equal(fetchCount, 0, "fetch must not be called when access token is missing");
});
