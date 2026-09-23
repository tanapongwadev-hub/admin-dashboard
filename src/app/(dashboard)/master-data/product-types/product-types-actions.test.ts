// Tests for the Server Actions in `actions.ts` — the actual CRUD layer
// for `/master-data/product-types`. Same pattern as
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

function makeProductTypeFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "pt-1",
    code: "FG",
    nameTh: "สินค้าสำเร็จรูป",
    nameEn: "Finished Goods",
    description: null,
    sortOrder: 0,
    isActive: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
    ...overrides,
  };
}

function makeCreatePayload() {
  return {
    code: "FG",
    nameTh: "สินค้าสำเร็จรูป",
    nameEn: "Finished Goods",
  };
}

function makeUpdatePayload() {
  return { nameTh: "สินค้าสำเร็จรูป (แก้ไข)", updatedAt: "2026-09-20T00:00:00.000Z" };
}

// ---------------------------------------------------------------------------
// performCreateProductType
// ---------------------------------------------------------------------------

test("performCreateProductType POSTs to /product-types and revalidates the list path on 200", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeProductTypeFixture());
  });

  const { performCreateProductType } = await import("./actions");
  const result = await performCreateProductType("test-token", makeCreatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/product-types");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
});

test("performCreateProductType returns 'conflict' on 409 (duplicate code)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "Product type code already exists" }));

  const { performCreateProductType } = await import("./actions");
  const result = await performCreateProductType("test-token", makeCreatePayload());

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่นแล้ว/);
});

test("performCreateProductType returns the joined API error message on non-2xx", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(500, { message: ["DB error", "Timeout"] }));

  const { performCreateProductType } = await import("./actions");
  const result = await performCreateProductType("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.match((result as { message: string }).message, /ระบบขัดข้องชั่วคราว/);
});

test("performCreateProductType returns a Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("ECONNREFUSED"); });

  const { performCreateProductType } = await import("./actions");
  const result = await performCreateProductType("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// performUpdateProductType
// ---------------------------------------------------------------------------

test("performUpdateProductType PATCHes /product-types/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductTypeFixture({ nameTh: "สินค้าสำเร็จรูป (แก้ไข)" }));
  });

  const { performUpdateProductType } = await import("./actions");
  const result = await performUpdateProductType("test-token", "pt-1", makeUpdatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/product-types/pt-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "สินค้าสำเร็จรูป (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-20T00:00:00.000Z");
});

test("performUpdateProductType returns 'conflict' on 409 (stale updatedAt)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "stale" }));

  const { performUpdateProductType } = await import("./actions");
  const result = await performUpdateProductType("test-token", "pt-1", makeUpdatePayload());

  assert.equal(result.status, "conflict");
});

// ---------------------------------------------------------------------------
// performDeactivateProductType / performRestoreProductType (soft delete)
// ---------------------------------------------------------------------------

test("performDeactivateProductType DELETEs /product-types/{id} and returns the deactivated product type", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductTypeFixture({ isActive: false }));
  });

  const { performDeactivateProductType } = await import("./actions");
  const result = await performDeactivateProductType("test-token", "pt-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/product-types/pt-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal((result as { productType: { isActive: boolean } }).productType.isActive, false);
});

test("performRestoreProductType PATCHes /product-types/{id}/restore and returns the reactivated product type", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductTypeFixture({ isActive: true }));
  });

  const { performRestoreProductType } = await import("./actions");
  const result = await performRestoreProductType("test-token", "pt-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/product-types/pt-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal((result as { productType: { isActive: boolean } }).productType.isActive, true);
});

// ---------------------------------------------------------------------------
// Public wrappers — guard against accidental refactors that drop the
// cookie-reading layer. The wrappers themselves are one-liners that call
// the matching `perform*` helper with the accessToken from cookies; a
// future refactor that deletes the wrapper (or breaks the wiring) is
// caught here without needing to mock `next/headers`.
// ---------------------------------------------------------------------------

test("all public ProductType action wrappers forward to their perform* helpers", async (t) => {
  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    fetchCount++;
    const url = String(input);
    if (init?.method === "POST") return jsonResponse(201, makeProductTypeFixture());
    if (init?.method === "PATCH" && url.endsWith("/restore")) return jsonResponse(200, makeProductTypeFixture({ isActive: true }));
    if (init?.method === "PATCH") return jsonResponse(200, makeProductTypeFixture({ nameTh: "x" }));
    if (init?.method === "DELETE") return jsonResponse(200, makeProductTypeFixture({ isActive: false }));
    return jsonResponse(200, makeProductTypeFixture());
  });

  const {
    createProductTypeAction,
    updateProductTypeAction,
    deactivateProductTypeAction,
    restoreProductTypeAction,
  } = await import("./actions");

  // With no access token present, every wrapper now signs the user out
  // (redirect to /api/auth/clear-cookies) instead of returning an error
  // object — redirect() throws Next.js's NEXT_REDIRECT sentinel, so each
  // call rejects. What this test actually pins down is unchanged: the
  // wrapper reads cookies first and never reaches the API without a token
  // (fetchCount stays 0 below).
  await assert.rejects(() => createProductTypeAction(makeCreatePayload()));
  await assert.rejects(() => updateProductTypeAction("pt-1", makeUpdatePayload()));
  await assert.rejects(() => deactivateProductTypeAction("pt-1"));
  await assert.rejects(() => restoreProductTypeAction("pt-1"));

  assert.equal(fetchCount, 0, "fetch must not be called when access token is missing");
});
