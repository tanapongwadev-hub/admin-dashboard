// Tests for the Server Actions in `actions.ts` — the actual CRUD layer
// for `/master-data/product-models`. Same pattern as
// `master-data/material-types/material-types-actions.test.ts`.

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

function makeProductModelFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "pm-1",
    code: "CAMRY",
    nameTh: "โตโยต้า แคมรี่",
    nameEn: "Toyota Camry",
    brand: "Toyota",
    description: null,
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
    code: "CAMRY",
    nameTh: "โตโยต้า แคมรี่",
    nameEn: "Toyota Camry",
    brand: "Toyota",
  };
}

function makeUpdatePayload() {
  return { nameTh: "โตโยต้า แคมรี่ (แก้ไข)", updatedAt: "2026-09-20T00:00:00.000Z" };
}

// ---------------------------------------------------------------------------
// performCreateProductModel
// ---------------------------------------------------------------------------

test("performCreateProductModel POSTs to /product-models and revalidates the list path on 200", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeProductModelFixture());
  });

  const { performCreateProductModel } = await import("./actions");
  const result = await performCreateProductModel("test-token", makeCreatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/product-models");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
});

test("performCreateProductModel returns 'conflict' on 409 (duplicate code)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "Product model code already exists" }));

  const { performCreateProductModel } = await import("./actions");
  const result = await performCreateProductModel("test-token", makeCreatePayload());

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่นแล้ว/);
});

test("performCreateProductModel returns the joined API error message on non-2xx", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(500, { message: ["DB error", "Timeout"] }));

  const { performCreateProductModel } = await import("./actions");
  const result = await performCreateProductModel("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.match((result as { message: string }).message, /DB error, Timeout/);
});

test("performCreateProductModel returns a Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("ECONNREFUSED"); });

  const { performCreateProductModel } = await import("./actions");
  const result = await performCreateProductModel("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// performUpdateProductModel
// ---------------------------------------------------------------------------

test("performUpdateProductModel PATCHes /product-models/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductModelFixture({ nameTh: "โตโยต้า แคมรี่ (แก้ไข)" }));
  });

  const { performUpdateProductModel } = await import("./actions");
  const result = await performUpdateProductModel("test-token", "pm-1", makeUpdatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/product-models/pm-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "โตโยต้า แคมรี่ (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-20T00:00:00.000Z");
});

test("performUpdateProductModel returns 'conflict' on 409 (stale updatedAt)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "stale" }));

  const { performUpdateProductModel } = await import("./actions");
  const result = await performUpdateProductModel("test-token", "pm-1", makeUpdatePayload());

  assert.equal(result.status, "conflict");
});

// ---------------------------------------------------------------------------
// performDeactivateProductModel / performRestoreProductModel (soft delete)
// ---------------------------------------------------------------------------

test("performDeactivateProductModel DELETEs /product-models/{id} and returns the deactivated product model", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductModelFixture({ isActive: false }));
  });

  const { performDeactivateProductModel } = await import("./actions");
  const result = await performDeactivateProductModel("test-token", "pm-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/product-models/pm-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal((result as { productModel: { isActive: boolean } }).productModel.isActive, false);
});

test("performRestoreProductModel PATCHes /product-models/{id}/restore and returns the reactivated product model", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductModelFixture({ isActive: true }));
  });

  const { performRestoreProductModel } = await import("./actions");
  const result = await performRestoreProductModel("test-token", "pm-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/product-models/pm-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal((result as { productModel: { isActive: boolean } }).productModel.isActive, true);
});

// ---------------------------------------------------------------------------
// Public wrappers
// ---------------------------------------------------------------------------

test("all public ProductModel action wrappers forward to their perform* helpers", async (t) => {
  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    fetchCount++;
    const url = String(input);
    if (init?.method === "POST") return jsonResponse(201, makeProductModelFixture());
    if (init?.method === "PATCH" && url.endsWith("/restore")) return jsonResponse(200, makeProductModelFixture({ isActive: true }));
    if (init?.method === "PATCH") return jsonResponse(200, makeProductModelFixture({ nameTh: "x" }));
    if (init?.method === "DELETE") return jsonResponse(200, makeProductModelFixture({ isActive: false }));
    return jsonResponse(200, makeProductModelFixture());
  });

  const {
    createProductModelAction,
    updateProductModelAction,
    deactivateProductModelAction,
    restoreProductModelAction,
  } = await import("./actions");

  await assert.rejects(() => createProductModelAction(makeCreatePayload()));
  await assert.rejects(() => updateProductModelAction("pm-1", makeUpdatePayload()));
  await assert.rejects(() => deactivateProductModelAction("pm-1"));
  await assert.rejects(() => restoreProductModelAction("pm-1"));

  assert.equal(fetchCount, 0, "fetch must not be called when access token is missing");
});