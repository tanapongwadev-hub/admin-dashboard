// Tests for the API functions in `src/lib/api/delivery-types.ts` — the
// master data client for the `/master-data/delivery-types` admin page.
// Mirrors cps-api's real `/delivery-types` module (see
// cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/delivery-types/delivery-types.controller.ts). Same
// fetch-mock + URL/headers assertion pattern as `loading-points.test.ts`
// and `categories.test.ts`.

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

function makeDeliveryTypeFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "dt-1",
    code: "DT-TRUCK",
    nameTh: "จัดส่งทางรถ",
    nameEn: "Truck Delivery",
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
// listDeliveryTypes — URL + headers
// ---------------------------------------------------------------------------

test("listDeliveryTypes GETs /delivery-types with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeDeliveryTypeFixture()]));
  });

  const { listDeliveryTypes } = await import("./delivery-types");
  const result = await listDeliveryTypes("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/delivery-types");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  // Same apiFetch contract as listLoadingPoints / listCategories /
  // listProcessSteps: GETs set Content-Type: application/json (the
  // backend's GET handler ignores it, but apiFetch sets it
  // unconditionally for non-FormData calls).
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listDeliveryTypes serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listDeliveryTypes } = await import("./delivery-types");
  await listDeliveryTypes("test-token", {
    page: 2,
    limit: 25,
    search: "truck",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/delivery-types");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "truck");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listDeliveryTypes skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listDeliveryTypes } = await import("./delivery-types");
  await listDeliveryTypes("test-token", {
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

test("listDeliveryTypes passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listDeliveryTypes } = await import("./delivery-types");
  await listDeliveryTypes("test-token", { isActive: false });

  const url = new URL(requestUrl);
  // Same guard rationale as listLoadingPoints' / listCategories' isActive
  // test: the serializer's `if (value === undefined || value === null ||
  // value === "") continue;` keeps an explicit `false` in the query
  // string, and the backend's isActive filter distinguishes "explicit
  // false" from "omitted".
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listDeliveryTypes — response parsing
// ---------------------------------------------------------------------------

test("listDeliveryTypes returns the parsed paginated result (items + meta)", async (t) => {
  const dts = [
    makeDeliveryTypeFixture({ id: "dt-1", code: "DT-TRUCK", nameTh: "จัดส่งทางรถ" }),
    makeDeliveryTypeFixture({ id: "dt-2", code: "DT-AIR", nameTh: "จัดส่งทางอากาศ" }),
    makeDeliveryTypeFixture({ id: "dt-3", code: "DT-SEA", nameTh: "จัดส่งทางเรือ" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(dts)));

  const { listDeliveryTypes } = await import("./delivery-types");
  const result = await listDeliveryTypes("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "DT-TRUCK");
  assert.equal(result.items[1].nameTh, "จัดส่งทางอากาศ");
  assert.equal(result.items[2].code, "DT-SEA");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getDeliveryType / createDeliveryType / updateDeliveryType / deactivateDeliveryType / restoreDeliveryType
// ---------------------------------------------------------------------------

test("getDeliveryType GETs /delivery-types/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeDeliveryTypeFixture());
  });

  const { getDeliveryType } = await import("./delivery-types");
  const result = await getDeliveryType("test-token", "dt-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/delivery-types/dt-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "dt-1");
});

test("createDeliveryType POSTs to /delivery-types with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeDeliveryTypeFixture({ code: "NEW" }));
  });

  const { createDeliveryType } = await import("./delivery-types");
  const result = await createDeliveryType("test-token", {
    code: "NEW",
    nameTh: "ประเภทการจัดส่งใหม่",
    nameEn: "New Delivery Type",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/delivery-types");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "NEW");
  assert.equal(body.nameTh, "ประเภทการจัดส่งใหม่");
  assert.equal(body.nameEn, "New Delivery Type");
  assert.equal(result.code, "NEW");
});

test("updateDeliveryType PATCHes /delivery-types/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeDeliveryTypeFixture({ nameTh: "ประเภทการจัดส่ง (แก้ไข)" }));
  });

  const { updateDeliveryType } = await import("./delivery-types");
  const result = await updateDeliveryType("test-token", "dt-1", {
    nameTh: "ประเภทการจัดส่ง (แก้ไข)",
    updatedAt: "2026-09-08T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/delivery-types/dt-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "ประเภทการจัดส่ง (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-08T00:00:00.000Z");
  assert.equal(result.nameTh, "ประเภทการจัดส่ง (แก้ไข)");
});

test("deactivateDeliveryType DELETEs /delivery-types/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeDeliveryTypeFixture({ isActive: false }));
  });

  const { deactivateDeliveryType } = await import("./delivery-types");
  const result = await deactivateDeliveryType("test-token", "dt-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/delivery-types/dt-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreDeliveryType PATCHes /delivery-types/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeDeliveryTypeFixture({ isActive: true }));
  });

  const { restoreDeliveryType } = await import("./delivery-types");
  const result = await restoreDeliveryType("test-token", "dt-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/delivery-types/dt-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});
