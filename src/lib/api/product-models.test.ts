// Tests for the API functions in `src/lib/api/product-models.ts` — the
// master data client for the `/master-data/product-models` admin page.
// Mirrors cps-api's real `/product-models` module (see
// cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/product-models/product-models.controller.ts). Same
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

function makePaginatedFixture(items: unknown[] = []) {
  return {
    items,
    meta: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 },
  };
}

// ---------------------------------------------------------------------------
// listProductModels — URL + headers
// ---------------------------------------------------------------------------

test("listProductModels GETs /product-models with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeProductModelFixture()]));
  });

  const { listProductModels } = await import("./product-models");
  const result = await listProductModels("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-models");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listProductModels serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProductModels } = await import("./product-models");
  await listProductModels("test-token", {
    page: 2,
    limit: 25,
    search: "toyota",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/product-models");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "toyota");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listProductModels skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProductModels } = await import("./product-models");
  await listProductModels("test-token", {
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

test("listProductModels passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProductModels } = await import("./product-models");
  await listProductModels("test-token", { isActive: false });

  const url = new URL(requestUrl);
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listProductModels — response parsing
// ---------------------------------------------------------------------------

test("listProductModels returns the parsed paginated result (items + meta)", async (t) => {
  const rrs = [
    makeProductModelFixture({ id: "pm-1", code: "CAMRY", nameTh: "โตโยต้า แคมรี่" }),
    makeProductModelFixture({ id: "pm-2", code: "CIVIC", nameTh: "ฮอนด้า ซีวิค" }),
    makeProductModelFixture({ id: "pm-3", code: "COROLLA", nameTh: "โตโยต้า โคโรล่า" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(rrs)));

  const { listProductModels } = await import("./product-models");
  const result = await listProductModels("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "CAMRY");
  assert.equal(result.items[1].nameTh, "ฮอนด้า ซีวิค");
  assert.equal(result.items[2].code, "COROLLA");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getProductModel / createProductModel / updateProductModel / deactivateProductModel / restoreProductModel
// ---------------------------------------------------------------------------

test("getProductModel GETs /product-models/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeProductModelFixture());
  });

  const { getProductModel } = await import("./product-models");
  const result = await getProductModel("test-token", "pm-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-models/pm-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "pm-1");
});

test("createProductModel POSTs to /product-models with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeProductModelFixture({ code: "NEW" }));
  });

  const { createProductModel } = await import("./product-models");
  const result = await createProductModel("test-token", {
    code: "NEW",
    nameTh: "รุ่นใหม่",
    nameEn: "New Model",
    brand: "BrandX",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-models");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "NEW");
  assert.equal(body.nameTh, "รุ่นใหม่");
  assert.equal(body.nameEn, "New Model");
  assert.equal(body.brand, "BrandX");
  assert.equal(result.code, "NEW");
});

test("updateProductModel PATCHes /product-models/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductModelFixture({ nameTh: "รุ่น (แก้ไข)" }));
  });

  const { updateProductModel } = await import("./product-models");
  const result = await updateProductModel("test-token", "pm-1", {
    nameTh: "รุ่น (แก้ไข)",
    updatedAt: "2026-09-20T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-models/pm-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "รุ่น (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-20T00:00:00.000Z");
  assert.equal(result.nameTh, "รุ่น (แก้ไข)");
});

test("deactivateProductModel DELETEs /product-models/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductModelFixture({ isActive: false }));
  });

  const { deactivateProductModel } = await import("./product-models");
  const result = await deactivateProductModel("test-token", "pm-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-models/pm-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreProductModel PATCHes /product-models/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProductModelFixture({ isActive: true }));
  });

  const { restoreProductModel } = await import("./product-models");
  const result = await restoreProductModel("test-token", "pm-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/product-models/pm-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});