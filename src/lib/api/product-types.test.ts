// Tests for the API functions in `src/lib/api/product-types.ts` — the
// master data client for the `/master-data/product-types` admin page.
// Mirrors cps-api's real `/product-types` module (see
// cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/product-types/product-types.controller.ts). Same
// fetch-mock + URL/headers assertion pattern as `material-types.test.ts`,
// `categories.test.ts`, etc.

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

function makePaginatedFixture(items: unknown[] = []) {
  return {
    items,
    meta: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
  };
}

// ---------------------------------------------------------------------------
// listProductTypes — URL + headers
// ---------------------------------------------------------------------------

test("listProductTypes GETs /product-types with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeProductTypeFixture()]));
  });

  const { listProductTypes } = await import("./product-types");
  const result = await listProductTypes("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-types");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listProductTypes serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProductTypes } = await import("./product-types");
  await listProductTypes("test-token", {
    page: 2,
    limit: 25,
    search: "spec",
    isActive: true,
    sortBy: "sortOrder",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/product-types");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "spec");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "sortOrder");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listProductTypes skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProductTypes } = await import("./product-types");
  await listProductTypes("test-token", {
    page: 1,
    limit: undefined,
    search: "",
    isActive: undefined,
    sortBy: "sortOrder",
    sortOrder: undefined,
  });

  const url = new URL(requestUrl);
  assert.equal(url.searchParams.get("page"), "1");
  assert.equal(url.searchParams.has("limit"), false);
  assert.equal(url.searchParams.has("search"), false);
  assert.equal(url.searchParams.has("isActive"), false);
  assert.equal(url.searchParams.get("sortBy"), "sortOrder");
  assert.equal(url.searchParams.has("sortOrder"), false);
});

test("listProductTypes passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProductTypes } = await import("./product-types");
  await listProductTypes("test-token", { isActive: false });

  const url = new URL(requestUrl);
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listProductTypes — response parsing
// ---------------------------------------------------------------------------

test("listProductTypes returns the parsed paginated result (items + meta)", async (t) => {
  const rrs = [
    makeProductTypeFixture({ id: "pt-1", code: "FG", nameTh: "Finished Goods" }),
    makeProductTypeFixture({ id: "pt-2", code: "SFG", nameTh: "Semi-Finished" }),
    makeProductTypeFixture({ id: "pt-3", code: "RM", nameTh: "Raw Material" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(rrs)));

  const { listProductTypes } = await import("./product-types");
  const result = await listProductTypes("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "FG");
  assert.equal(result.items[1].nameTh, "Semi-Finished");
  assert.equal(result.items[2].code, "RM");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getProductType / createProductType / updateProductType / deactivateProductType / restoreProductType
// ---------------------------------------------------------------------------

test("getProductType GETs /product-types/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeProductTypeFixture());
  });

  const { getProductType } = await import("./product-types");
  const result = await getProductType("test-token", "pt-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-types/pt-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "pt-1");
});

test("createProductType POSTs to /product-types with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeProductTypeFixture({ code: "NEW" }));
  });

  const { createProductType } = await import("./product-types");
  const result = await createProductType("test-token", {
    code: "NEW",
    nameTh: "ประเภทใหม่",
    nameEn: "New Type",
    sortOrder: 5,
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-types");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "NEW");
  assert.equal(body.nameTh, "ประเภทใหม่");
  assert.equal(body.nameEn, "New Type");
  assert.equal(body.sortOrder, 5);
  assert.equal(result.code, "NEW");
});

test("updateProductType PATCHes /product-types/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductTypeFixture({ nameTh: "ประเภท (แก้ไข)" }));
  });

  const { updateProductType } = await import("./product-types");
  const result = await updateProductType("test-token", "pt-1", {
    nameTh: "ประเภท (แก้ไข)",
    updatedAt: "2026-09-20T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-types/pt-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "ประเภท (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-20T00:00:00.000Z");
  assert.equal(result.nameTh, "ประเภท (แก้ไข)");
});

test("deactivateProductType DELETEs /product-types/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductTypeFixture({ isActive: false }));
  });

  const { deactivateProductType } = await import("./product-types");
  const result = await deactivateProductType("test-token", "pt-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-types/pt-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreProductType PATCHes /product-types/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductTypeFixture({ isActive: true }));
  });

  const { restoreProductType } = await import("./product-types");
  const result = await restoreProductType("test-token", "pt-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-types/pt-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});