// Tests for the API functions in `src/lib/api/material-types.ts` — the
// master data client for the `/master-data/material-types` admin page.
// Mirrors cps-api's real `/material-types` module (see
// cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/material-types/material-types.controller.ts). Same
// fetch-mock + URL/headers assertion pattern as `delivery-types.test.ts`,
// `loading-points.test.ts`, and `categories.test.ts`.

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

function makeMaterialTypeFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "mt-1",
    code: "PC",
    nameTh: "PC",
    nameEn: "Piece",
    description: null,
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
// listMaterialTypes — URL + headers
// ---------------------------------------------------------------------------

test("listMaterialTypes GETs /material-types with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeMaterialTypeFixture()]));
  });

  const { listMaterialTypes } = await import("./material-types");
  const result = await listMaterialTypes("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-types");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  // Same apiFetch contract as listDeliveryTypes / listLoadingPoints /
  // listCategories / listProcessSteps: GETs set Content-Type: application/json
  // (the backend's GET handler ignores it, but apiFetch sets it
  // unconditionally for non-FormData calls).
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listMaterialTypes serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listMaterialTypes } = await import("./material-types");
  await listMaterialTypes("test-token", {
    page: 2,
    limit: 25,
    search: "spec",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/material-types");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "spec");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listMaterialTypes skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listMaterialTypes } = await import("./material-types");
  await listMaterialTypes("test-token", {
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

test("listMaterialTypes passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listMaterialTypes } = await import("./material-types");
  await listMaterialTypes("test-token", { isActive: false });

  const url = new URL(requestUrl);
  // Same guard rationale as listDeliveryTypes' / listLoadingPoints' /
  // listCategories' isActive test: the serializer's `if (value ===
  // undefined || value === null || value === "") continue;` keeps an
  // explicit `false` in the query string, and the backend's isActive
  // filter distinguishes "explicit false" from "omitted".
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listMaterialTypes — response parsing
// ---------------------------------------------------------------------------

test("listMaterialTypes returns the parsed paginated result (items + meta)", async (t) => {
  const rrs = [
    makeMaterialTypeFixture({ id: "mt-1", code: "PC", nameTh: "PC" }),
    makeMaterialTypeFixture({ id: "mt-2", code: "OF", nameTh: "OF" }),
    makeMaterialTypeFixture({ id: "mt-3", code: "OF_MAT", nameTh: "OF-MAT" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(rrs)));

  const { listMaterialTypes } = await import("./material-types");
  const result = await listMaterialTypes("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "PC");
  assert.equal(result.items[1].nameTh, "OF");
  assert.equal(result.items[2].code, "OF_MAT");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getMaterialType / createMaterialType / updateMaterialType / deactivateMaterialType / restoreMaterialType
// ---------------------------------------------------------------------------

test("getMaterialType GETs /material-types/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeMaterialTypeFixture());
  });

  const { getMaterialType } = await import("./material-types");
  const result = await getMaterialType("test-token", "mt-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-types/mt-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "mt-1");
});

test("createMaterialType POSTs to /material-types with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeMaterialTypeFixture({ code: "NEW" }));
  });

  const { createMaterialType } = await import("./material-types");
  const result = await createMaterialType("test-token", {
    code: "NEW",
    nameTh: "ประเภทใหม่",
    nameEn: "New Type",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-types");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "NEW");
  assert.equal(body.nameTh, "ประเภทใหม่");
  assert.equal(body.nameEn, "New Type");
  assert.equal(result.code, "NEW");
});

test("updateMaterialType PATCHes /material-types/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialTypeFixture({ nameTh: "ประเภท (แก้ไข)" }));
  });

  const { updateMaterialType } = await import("./material-types");
  const result = await updateMaterialType("test-token", "mt-1", {
    nameTh: "ประเภท (แก้ไข)",
    updatedAt: "2026-09-09T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-types/mt-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "ประเภท (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-09T00:00:00.000Z");
  assert.equal(result.nameTh, "ประเภท (แก้ไข)");
});

test("deactivateMaterialType DELETEs /material-types/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialTypeFixture({ isActive: false }));
  });

  const { deactivateMaterialType } = await import("./material-types");
  const result = await deactivateMaterialType("test-token", "mt-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-types/mt-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreMaterialType PATCHes /material-types/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialTypeFixture({ isActive: true }));
  });

  const { restoreMaterialType } = await import("./material-types");
  const result = await restoreMaterialType("test-token", "mt-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-types/mt-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});
