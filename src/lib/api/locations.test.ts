// Tests for the API functions in `src/lib/api/locations.ts` — the master
// data client for the `/master-data/locations` admin page. Mirrors
// cps-api's real `/locations` module (see cps-api/API_ENDPOINTS.md § 5.1
// and cps-api/src/modules/locations/locations.controller.ts). Same
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

function makeLocationFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "loc-1",
    code: "LOC-A",
    nameTh: "คลัง A",
    nameEn: "Warehouse A",
    zone: "Zone-1",
    warehouse: "WH-A",
    description: "คลังหลัก",
    isActive: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
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
// listLocations — URL + headers
// ---------------------------------------------------------------------------

test("listLocations GETs /locations with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeLocationFixture()]));
  });

  const { listLocations } = await import("./locations");
  const result = await listLocations("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/locations");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listLocations serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listLocations } = await import("./locations");
  await listLocations("test-token", {
    page: 2,
    limit: 25,
    search: "wh-a",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/locations");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "wh-a");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listLocations skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listLocations } = await import("./locations");
  await listLocations("test-token", {
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

test("listLocations passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listLocations } = await import("./locations");
  await listLocations("test-token", { isActive: false });

  const url = new URL(requestUrl);
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listLocations — response parsing
// ---------------------------------------------------------------------------

test("listLocations returns the parsed paginated result (items + meta)", async (t) => {
  const rrs = [
    makeLocationFixture({ id: "loc-1", code: "LOC-A", nameTh: "คลัง A" }),
    makeLocationFixture({ id: "loc-2", code: "LOC-B", nameTh: "คลัง B" }),
    makeLocationFixture({ id: "loc-3", code: "LOC-C", nameTh: "คลัง C" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(rrs)));

  const { listLocations } = await import("./locations");
  const result = await listLocations("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "LOC-A");
  assert.equal(result.items[1].nameTh, "คลัง B");
  assert.equal(result.items[2].code, "LOC-C");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getLocation / createLocation / updateLocation / deactivateLocation / restoreLocation
// ---------------------------------------------------------------------------

test("getLocation GETs /locations/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeLocationFixture());
  });

  const { getLocation } = await import("./locations");
  const result = await getLocation("test-token", "loc-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/locations/loc-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "loc-1");
});

test("createLocation POSTs to /locations with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeLocationFixture({ code: "NEW" }));
  });

  const { createLocation } = await import("./locations");
  const result = await createLocation("test-token", {
    code: "NEW",
    nameTh: "คลังใหม่",
    nameEn: "New Warehouse",
    zone: "Zone-2",
    warehouse: "WH-NEW",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/locations");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "NEW");
  assert.equal(body.nameTh, "คลังใหม่");
  assert.equal(body.zone, "Zone-2");
  assert.equal(body.warehouse, "WH-NEW");
  assert.equal(result.code, "NEW");
});

test("updateLocation PATCHes /locations/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLocationFixture({ nameTh: "คลัง (แก้ไข)" }));
  });

  const { updateLocation } = await import("./locations");
  const result = await updateLocation("test-token", "loc-1", {
    nameTh: "คลัง (แก้ไข)",
    updatedAt: "2026-09-21T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/locations/loc-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "คลัง (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-21T00:00:00.000Z");
  assert.equal(result.nameTh, "คลัง (แก้ไข)");
});

test("deactivateLocation DELETEs /locations/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLocationFixture({ isActive: false }));
  });

  const { deactivateLocation } = await import("./locations");
  const result = await deactivateLocation("test-token", "loc-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/locations/loc-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreLocation PATCHes /locations/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLocationFixture({ isActive: true }));
  });

  const { restoreLocation } = await import("./locations");
  const result = await restoreLocation("test-token", "loc-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/locations/loc-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});