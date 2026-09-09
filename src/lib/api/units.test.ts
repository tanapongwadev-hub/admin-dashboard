// Tests for the API functions in `src/lib/api/units.ts` — the
// master data client for the `/master-data/units` admin page.
// Mirrors cps-api's real `/units` module (see
// cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/units/units.controller.ts). Same
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

function makeUnitFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "u-1",
    code: "PCS",
    nameTh: "ชิ้น",
    nameEn: "Pieces",
    symbol: "ชิ้น",
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
// listUnits — URL + headers
// ---------------------------------------------------------------------------

test("listUnits GETs /units with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeUnitFixture()]));
  });

  const { listUnits } = await import("./units");
  const result = await listUnits("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/units");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listUnits serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listUnits } = await import("./units");
  await listUnits("test-token", {
    page: 2,
    limit: 25,
    search: "pcs",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/units");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "pcs");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listUnits skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listUnits } = await import("./units");
  await listUnits("test-token", {
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

test("listUnits passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listUnits } = await import("./units");
  await listUnits("test-token", { isActive: false });

  const url = new URL(requestUrl);
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listUnits — response parsing
// ---------------------------------------------------------------------------

test("listUnits returns the parsed paginated result (items + meta)", async (t) => {
  const units = [
    makeUnitFixture({ id: "u-1", code: "PCS", nameTh: "ชิ้น" }),
    makeUnitFixture({ id: "u-2", code: "KG", nameTh: "กิโลกรัม" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(units)));

  const { listUnits } = await import("./units");
  const result = await listUnits("test-token");

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].code, "PCS");
  assert.equal(result.items[1].nameTh, "กิโลกรัม");
  assert.equal(result.meta.totalItems, 2);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getUnit / createUnit / updateUnit / deactivateUnit / restoreUnit
// ---------------------------------------------------------------------------

test("getUnit GETs /units/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeUnitFixture());
  });

  const { getUnit } = await import("./units");
  const result = await getUnit("test-token", "u-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/units/u-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "u-1");
});

test("createUnit POSTs to /units with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeUnitFixture({ code: "LTR" }));
  });

  const { createUnit } = await import("./units");
  const result = await createUnit("test-token", {
    code: "LTR",
    nameTh: "ลิตร",
    symbol: "ลิตร",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/units");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "LTR");
  assert.equal(body.nameTh, "ลิตร");
  assert.equal(body.symbol, "ลิตร");
  assert.equal(result.code, "LTR");
});

test("updateUnit PATCHes /units/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeUnitFixture({ nameTh: "ชิ้น (แก้ไข)" }));
  });

  const { updateUnit } = await import("./units");
  const result = await updateUnit("test-token", "u-1", {
    nameTh: "ชิ้น (แก้ไข)",
    updatedAt: "2026-09-09T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/units/u-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "ชิ้น (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-09T00:00:00.000Z");
  assert.equal(result.nameTh, "ชิ้น (แก้ไข)");
});

test("deactivateUnit DELETEs /units/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeUnitFixture({ isActive: false }));
  });

  const { deactivateUnit } = await import("./units");
  const result = await deactivateUnit("test-token", "u-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/units/u-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreUnit PATCHes /units/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeUnitFixture({ isActive: true }));
  });

  const { restoreUnit } = await import("./units");
  const result = await restoreUnit("test-token", "u-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/units/u-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});
