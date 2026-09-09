// Tests for the API functions in `src/lib/api/loading-points.ts` — the
// master data client for the `/master-data/loading-points` admin page.
// Mirrors cps-api's real `/loading-points` module (see
// cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/loading-points/loading-points.controller.ts). Same
// fetch-mock + URL/headers assertion pattern as `categories.test.ts` and
// `process-steps.test.ts`.

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

function makeLoadingPointFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "lp-1",
    code: "LP-A1",
    nameTh: "จุดขนถ่าย A1",
    nameEn: "Loading Point A1",
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
// listLoadingPoints — URL + headers
// ---------------------------------------------------------------------------

test("listLoadingPoints GETs /loading-points with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeLoadingPointFixture()]));
  });

  const { listLoadingPoints } = await import("./loading-points");
  const result = await listLoadingPoints("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/loading-points");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  // Same apiFetch contract as listCategories / listProcessSteps: GETs set
  // Content-Type: application/json (the backend's GET handler ignores it,
  // but apiFetch sets it unconditionally for non-FormData calls).
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listLoadingPoints serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listLoadingPoints } = await import("./loading-points");
  await listLoadingPoints("test-token", {
    page: 2,
    limit: 25,
    search: "a1",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/loading-points");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "a1");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listLoadingPoints skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listLoadingPoints } = await import("./loading-points");
  await listLoadingPoints("test-token", {
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

test("listLoadingPoints passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listLoadingPoints } = await import("./loading-points");
  await listLoadingPoints("test-token", { isActive: false });

  const url = new URL(requestUrl);
  // Same guard rationale as listCategories' isActive test: the serializer's
  // `if (value === undefined || value === null || value === "") continue;`
  // keeps an explicit `false` in the query string, and the backend's
  // isActive filter distinguishes "explicit false" from "omitted".
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listLoadingPoints — response parsing
// ---------------------------------------------------------------------------

test("listLoadingPoints returns the parsed paginated result (items + meta)", async (t) => {
  const lps = [
    makeLoadingPointFixture({ id: "lp-1", code: "LP-A1", nameTh: "จุดขนถ่าย A1" }),
    makeLoadingPointFixture({ id: "lp-2", code: "LP-B2", nameTh: "จุดขนถ่าย B2" }),
    makeLoadingPointFixture({ id: "lp-3", code: "LP-C3", nameTh: "จุดขนถ่าย C3" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(lps)));

  const { listLoadingPoints } = await import("./loading-points");
  const result = await listLoadingPoints("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "LP-A1");
  assert.equal(result.items[1].nameTh, "จุดขนถ่าย B2");
  assert.equal(result.items[2].code, "LP-C3");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getLoadingPoint / createLoadingPoint / updateLoadingPoint / deactivateLoadingPoint / restoreLoadingPoint
// ---------------------------------------------------------------------------

test("getLoadingPoint GETs /loading-points/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeLoadingPointFixture());
  });

  const { getLoadingPoint } = await import("./loading-points");
  const result = await getLoadingPoint("test-token", "lp-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/loading-points/lp-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "lp-1");
});

test("createLoadingPoint POSTs to /loading-points with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeLoadingPointFixture({ code: "NEW" }));
  });

  const { createLoadingPoint } = await import("./loading-points");
  const result = await createLoadingPoint("test-token", {
    code: "NEW",
    nameTh: "จุดขนถ่ายใหม่",
    nameEn: "New Loading Point",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/loading-points");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "NEW");
  assert.equal(body.nameTh, "จุดขนถ่ายใหม่");
  assert.equal(body.nameEn, "New Loading Point");
  assert.equal(result.code, "NEW");
});

test("updateLoadingPoint PATCHes /loading-points/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLoadingPointFixture({ nameTh: "จุดขนถ่าย (แก้ไข)" }));
  });

  const { updateLoadingPoint } = await import("./loading-points");
  const result = await updateLoadingPoint("test-token", "lp-1", {
    nameTh: "จุดขนถ่าย (แก้ไข)",
    updatedAt: "2026-09-08T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/loading-points/lp-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "จุดขนถ่าย (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-08T00:00:00.000Z");
  assert.equal(result.nameTh, "จุดขนถ่าย (แก้ไข)");
});

test("deactivateLoadingPoint DELETEs /loading-points/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLoadingPointFixture({ isActive: false }));
  });

  const { deactivateLoadingPoint } = await import("./loading-points");
  const result = await deactivateLoadingPoint("test-token", "lp-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/loading-points/lp-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreLoadingPoint PATCHes /loading-points/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeLoadingPointFixture({ isActive: true }));
  });

  const { restoreLoadingPoint } = await import("./loading-points");
  const result = await restoreLoadingPoint("test-token", "lp-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/loading-points/lp-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});
