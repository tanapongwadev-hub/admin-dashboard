// Tests for the API functions in `src/lib/api/suppliers.ts` — the
// master data client for the `/master-data/suppliers` admin page.
// Mirrors cps-api's real `/suppliers` module (see
// cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/suppliers/suppliers.controller.ts). Same
// fetch-mock + URL/headers assertion pattern as the other simple-master
// API tests.

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
    address: "123 ถนนตัวอย่าง แขวงสวนจาง เขตบางกะปิ กรุงเทพฯ 10240",
    isActive: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
    ...overrides,
  };
}

function makePaginatedFixture(items: unknown[] = []) {
  return {
    items,
    meta: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
  };
}

// ---------------------------------------------------------------------------
// listSuppliers — URL + headers
// ---------------------------------------------------------------------------

test("listSuppliers GETs /suppliers with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeSupplierFixture()]));
  });

  const { listSuppliers } = await import("./suppliers");
  const result = await listSuppliers("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/suppliers");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listSuppliers serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listSuppliers } = await import("./suppliers");
  await listSuppliers("test-token", {
    page: 2,
    limit: 25,
    search: "example",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/suppliers");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "example");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listSuppliers skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listSuppliers } = await import("./suppliers");
  await listSuppliers("test-token", {
    page: 1,
    limit: undefined,
    search: "",
    isActive: undefined,
    sortBy: "code",
    sortOrder: undefined,
  });

  const url = new URL(requestUrl);
  assert.equal(url.searchParams.get("page"), "1");
  assert.equal(url.searchParams.has("limit"), false);
  assert.equal(url.searchParams.has("search"), false);
  assert.equal(url.searchParams.has("isActive"), false);
  assert.equal(url.searchParams.get("sortBy"), "code");
  assert.equal(url.searchParams.has("sortOrder"), false);
});

test("listSuppliers passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listSuppliers } = await import("./suppliers");
  await listSuppliers("test-token", { isActive: false });

  const url = new URL(requestUrl);
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listSuppliers — response parsing
// ---------------------------------------------------------------------------

test("listSuppliers returns the parsed paginated result (items + meta)", async (t) => {
  const suppliers = [
    makeSupplierFixture({ id: "sup-1", code: "SUP-A", nameTh: "ผู้จัดจำหน่าย A" }),
    makeSupplierFixture({ id: "sup-2", code: "SUP-B", nameTh: "ผู้จัดจำหน่าย B" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(suppliers)));

  const { listSuppliers } = await import("./suppliers");
  const result = await listSuppliers("test-token");

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].code, "SUP-A");
  assert.equal(result.items[1].nameTh, "ผู้จัดจำหน่าย B");
  assert.equal(result.meta.totalItems, 2);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getSupplier / createSupplier / updateSupplier / deactivateSupplier / restoreSupplier
// ---------------------------------------------------------------------------

test("getSupplier GETs /suppliers/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeSupplierFixture());
  });

  const { getSupplier } = await import("./suppliers");
  const result = await getSupplier("test-token", "sup-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/suppliers/sup-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "sup-1");
});

test("createSupplier POSTs to /suppliers with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeSupplierFixture({ code: "SUP-NEW" }));
  });

  const { createSupplier } = await import("./suppliers");
  const result = await createSupplier("test-token", {
    code: "SUP-NEW",
    nameTh: "ผู้จัดจำหน่ายใหม่",
    contactName: "ผู้ติดต่อใหม่",
    email: "new@supplier.example",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/suppliers");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "SUP-NEW");
  assert.equal(body.nameTh, "ผู้จัดจำหน่ายใหม่");
  assert.equal(body.contactName, "ผู้ติดต่อใหม่");
  assert.equal(result.code, "SUP-NEW");
});

test("updateSupplier PATCHes /suppliers/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeSupplierFixture({ nameTh: "ผู้จัดจำหน่าย (แก้ไข)" }));
  });

  const { updateSupplier } = await import("./suppliers");
  const result = await updateSupplier("test-token", "sup-1", {
    nameTh: "ผู้จัดจำหน่าย (แก้ไข)",
    updatedAt: "2026-09-09T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/suppliers/sup-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "ผู้จัดจำหน่าย (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-09T00:00:00.000Z");
  assert.equal(result.nameTh, "ผู้จัดจำหน่าย (แก้ไข)");
});

test("deactivateSupplier DELETEs /suppliers/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeSupplierFixture({ isActive: false }));
  });

  const { deactivateSupplier } = await import("./suppliers");
  const result = await deactivateSupplier("test-token", "sup-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/suppliers/sup-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreSupplier PATCHes /suppliers/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeSupplierFixture({ isActive: true }));
  });

  const { restoreSupplier } = await import("./suppliers");
  const result = await restoreSupplier("test-token", "sup-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/suppliers/sup-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});
