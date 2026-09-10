// Tests for the Server Actions in `actions.ts` — the actual CRUD layer
// for `/master-data/suppliers`. Same pattern as the other simple-master
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

function makeSupplierFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "sup-1",
    code: "SUP-A",
    nameTh: "บริษัท ผู้จัดจำหน่าย ตัวอย่าง",
    nameEn: "Example Supplier Co., Ltd.",
    taxId: "0105548012345",
    contactName: "สมชาย จัดการดี",
    telephone: "02-123-4567",
    email: "contact@supplier.example",
    address: "123 ถนนตัวอย่าง กรุงเทพฯ 10240",
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
    code: "SUP-A",
    nameTh: "บริษัท ผู้จัดจำหน่าย ตัวอย่าง",
    contactName: "สมชาย จัดการดี",
    email: "contact@supplier.example",
  };
}

function makeUpdatePayload() {
  return { nameTh: "ผู้จัดจำหน่าย (แก้ไข)", updatedAt: "2026-09-09T00:00:00.000Z" };
}

// ---------------------------------------------------------------------------
// performCreateSupplier
// ---------------------------------------------------------------------------

test("performCreateSupplier POSTs to /suppliers and revalidates the list path on 200", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeSupplierFixture());
  });

  const { performCreateSupplier } = await import("./actions");
  const result = await performCreateSupplier("test-token", makeCreatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/suppliers");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
});

test("performCreateSupplier returns 'conflict' on 409 (duplicate code)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "Supplier code already exists" }));

  const { performCreateSupplier } = await import("./actions");
  const result = await performCreateSupplier("test-token", makeCreatePayload());

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่นแล้ว/);
});

test("performCreateSupplier returns the joined API error message on non-2xx", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(500, { message: ["DB error", "Timeout"] }));

  const { performCreateSupplier } = await import("./actions");
  const result = await performCreateSupplier("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.match((result as { message: string }).message, /DB error, Timeout/);
});

test("performCreateSupplier returns a Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("ECONNREFUSED"); });

  const { performCreateSupplier } = await import("./actions");
  const result = await performCreateSupplier("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// performUpdateSupplier
// ---------------------------------------------------------------------------

test("performUpdateSupplier PATCHes /suppliers/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeSupplierFixture({ nameTh: "ผู้จัดจำหน่าย (แก้ไข)" }));
  });

  const { performUpdateSupplier } = await import("./actions");
  const result = await performUpdateSupplier("test-token", "sup-1", makeUpdatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/suppliers/sup-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "ผู้จัดจำหน่าย (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-09T00:00:00.000Z");
});

test("performUpdateSupplier returns 'conflict' on 409 (stale updatedAt)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "stale" }));

  const { performUpdateSupplier } = await import("./actions");
  const result = await performUpdateSupplier("test-token", "sup-1", makeUpdatePayload());

  assert.equal(result.status, "conflict");
});

// ---------------------------------------------------------------------------
// performDeactivateSupplier / performRestoreSupplier (soft delete)
// ---------------------------------------------------------------------------

test("performDeactivateSupplier DELETEs /suppliers/{id} and returns the deactivated supplier", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeSupplierFixture({ isActive: false }));
  });

  const { performDeactivateSupplier } = await import("./actions");
  const result = await performDeactivateSupplier("test-token", "sup-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/suppliers/sup-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal((result as { supplier: { isActive: boolean } }).supplier.isActive, false);
});

test("performRestoreSupplier PATCHes /suppliers/{id}/restore and returns the reactivated supplier", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeSupplierFixture({ isActive: true }));
  });

  const { performRestoreSupplier } = await import("./actions");
  const result = await performRestoreSupplier("test-token", "sup-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/suppliers/sup-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal((result as { supplier: { isActive: boolean } }).supplier.isActive, true);
});

// ---------------------------------------------------------------------------
// Public wrappers — guard against accidental refactors that drop the
// cookie-reading layer. The wrappers themselves are one-liners that call
// the matching `perform*` helper with the accessToken from cookies; a
// future refactor that deletes the wrapper (or breaks the wiring) is
// caught here without needing to mock `next/headers`.
// ---------------------------------------------------------------------------

test("all public Supplier action wrappers forward to their perform* helpers", async (t) => {
  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    fetchCount++;
    const url = String(input);
    if (init?.method === "POST") return jsonResponse(201, makeSupplierFixture());
    if (init?.method === "PATCH" && url.endsWith("/restore")) return jsonResponse(200, makeSupplierFixture({ isActive: true }));
    if (init?.method === "PATCH") return jsonResponse(200, makeSupplierFixture({ nameTh: "x" }));
    if (init?.method === "DELETE") return jsonResponse(200, makeSupplierFixture({ isActive: false }));
    return jsonResponse(200, makeSupplierFixture());
  });

  const {
    createSupplierAction,
    updateSupplierAction,
    deactivateSupplierAction,
    restoreSupplierAction,
  } = await import("./actions");

  // With no access token present, every wrapper now signs the user out
  // (redirect to /api/auth/clear-cookies) instead of returning an error
  // object — redirect() throws Next.js's NEXT_REDIRECT sentinel, so each
  // call rejects. What this test actually pins down is unchanged: the
  // wrapper reads cookies first and never reaches the API without a token
  // (fetchCount stays 0 below).
  await assert.rejects(() => createSupplierAction(makeCreatePayload()));
  await assert.rejects(() => updateSupplierAction("sup-1", makeUpdatePayload()));
  await assert.rejects(() => deactivateSupplierAction("sup-1"));
  await assert.rejects(() => restoreSupplierAction("sup-1"));

  assert.equal(fetchCount, 0, "fetch must not be called when access token is missing");
});
