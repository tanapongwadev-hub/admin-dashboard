// Tests for the API functions in `src/lib/api/categories.ts` — the master
// data client for the `/master-data/categories` admin page. Mirrors
// cps-api's real `/categories` module (see cps-api/API_ENDPOINTS.md § 5.1
// and cps-api/src/modules/categories/categories.controller.ts). Same
// fetch-mock + URL/headers assertion pattern as
// `process-steps.test.ts` and `materials-pc-actions.test.ts`.

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

function makeCategoryFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "cat-1",
    code: "ELECTRONIC",
    nameTh: "อิเล็กทรอนิกส์",
    nameEn: "Electronics",
    parentId: null,
    sortOrder: 1,
    iconColor: "#4640DE",
    description: null,
    isActive: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
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
// listCategories — URL + headers
// ---------------------------------------------------------------------------

test("listCategories GETs /categories with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeCategoryFixture()]));
  });

  const { listCategories } = await import("./categories");
  const result = await listCategories("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/categories");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  // Same contract as listProcessSteps: apiFetch sets Content-Type: application/json
  // for non-FormData calls regardless of method. The backend's GET /categories
  // ignores the request Content-Type, but sending it doesn't hurt.
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listCategories serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listCategories } = await import("./categories");
  await listCategories("test-token", {
    page: 2,
    limit: 25,
    search: "ele",
    isActive: true,
    sortBy: "sortOrder",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/categories");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "ele");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "sortOrder");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listCategories skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listCategories } = await import("./categories");
  await listCategories("test-token", {
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

test("listCategories passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listCategories } = await import("./categories");
  await listCategories("test-token", { isActive: false });

  const url = new URL(requestUrl);
  // The serializer's guard is `if (value === undefined || value === null || value === "") continue;`
  // — false passes all three, so it must be present in the query string. The
  // backend's isActive filter distinguishes "explicit false" from "omitted",
  // and the test pins that contract.
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listCategories — response parsing
// ---------------------------------------------------------------------------

test("listCategories returns the parsed paginated result (items + meta)", async (t) => {
  const cats = [
    makeCategoryFixture({ id: "cat-1", code: "ELECTRONIC", nameTh: "อิเล็กทรอนิกส์" }),
    makeCategoryFixture({ id: "cat-2", code: "FASHION", nameTh: "เครื่องแต่งกาย" }),
    makeCategoryFixture({ id: "cat-3", code: "HOME", nameTh: "ของแต่งบ้าน" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(cats)));

  const { listCategories } = await import("./categories");
  const result = await listCategories("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "ELECTRONIC");
  assert.equal(result.items[1].nameTh, "เครื่องแต่งกาย");
  assert.equal(result.items[2].code, "HOME");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getCategory / createCategory / updateCategory / deactivateCategory / restoreCategory
// ---------------------------------------------------------------------------

test("getCategory GETs /categories/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeCategoryFixture());
  });

  const { getCategory } = await import("./categories");
  const result = await getCategory("test-token", "cat-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/categories/cat-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "cat-1");
});

test("createCategory POSTs to /categories with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeCategoryFixture({ code: "NEW" }));
  });

  const { createCategory } = await import("./categories");
  const result = await createCategory("test-token", {
    code: "NEW",
    nameTh: "หมวดใหม่",
    sortOrder: 5,
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/categories");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "NEW");
  assert.equal(body.nameTh, "หมวดใหม่");
  assert.equal(body.sortOrder, 5);
  assert.equal(result.code, "NEW");
});

test("updateCategory PATCHes /categories/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeCategoryFixture({ nameTh: "แก้ไขแล้ว" }));
  });

  const { updateCategory } = await import("./categories");
  const result = await updateCategory("test-token", "cat-1", {
    nameTh: "แก้ไขแล้ว",
    updatedAt: "2026-09-08T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/categories/cat-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "แก้ไขแล้ว");
  assert.equal(body.updatedAt, "2026-09-08T00:00:00.000Z");
  assert.equal(result.nameTh, "แก้ไขแล้ว");
});

test("deactivateCategory DELETEs /categories/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeCategoryFixture({ isActive: false }));
  });

  const { deactivateCategory } = await import("./categories");
  const result = await deactivateCategory("test-token", "cat-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/categories/cat-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreCategory PATCHes /categories/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeCategoryFixture({ isActive: true }));
  });

  const { restoreCategory } = await import("./categories");
  const result = await restoreCategory("test-token", "cat-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/categories/cat-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});
