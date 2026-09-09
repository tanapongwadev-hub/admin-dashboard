// Tests for the API functions in `src/lib/api/reject-reasons.ts` — the
// master data client for the `/master-data/reject-reasons` admin page.
// Mirrors cps-api's real `/reject-reasons` module (see
// cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/reject-reasons/reject-reasons.controller.ts). Same
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

function makeRejectReasonFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "rr-1",
    code: "RR-OUT-OF-SPEC",
    nameTh: "คุณสมบัติไม่ตรงตามสเปก",
    nameEn: "Out of Specification",
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
// listRejectReasons — URL + headers
// ---------------------------------------------------------------------------

test("listRejectReasons GETs /reject-reasons with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeRejectReasonFixture()]));
  });

  const { listRejectReasons } = await import("./reject-reasons");
  const result = await listRejectReasons("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/reject-reasons");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  // Same apiFetch contract as listDeliveryTypes / listLoadingPoints /
  // listCategories / listProcessSteps: GETs set Content-Type: application/json
  // (the backend's GET handler ignores it, but apiFetch sets it
  // unconditionally for non-FormData calls).
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listRejectReasons serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listRejectReasons } = await import("./reject-reasons");
  await listRejectReasons("test-token", {
    page: 2,
    limit: 25,
    search: "spec",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/reject-reasons");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "spec");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listRejectReasons skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listRejectReasons } = await import("./reject-reasons");
  await listRejectReasons("test-token", {
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

test("listRejectReasons passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listRejectReasons } = await import("./reject-reasons");
  await listRejectReasons("test-token", { isActive: false });

  const url = new URL(requestUrl);
  // Same guard rationale as listDeliveryTypes' / listLoadingPoints' /
  // listCategories' isActive test: the serializer's `if (value ===
  // undefined || value === null || value === "") continue;` keeps an
  // explicit `false` in the query string, and the backend's isActive
  // filter distinguishes "explicit false" from "omitted".
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listRejectReasons — response parsing
// ---------------------------------------------------------------------------

test("listRejectReasons returns the parsed paginated result (items + meta)", async (t) => {
  const rrs = [
    makeRejectReasonFixture({ id: "rr-1", code: "RR-OOS", nameTh: "คุณสมบัติไม่ตรงตามสเปก" }),
    makeRejectReasonFixture({ id: "rr-2", code: "RR-DMG", nameTh: "ชำรุดเสียหาย" }),
    makeRejectReasonFixture({ id: "rr-3", code: "RR-WRONG", nameTh: "สินค้าไม่ตรงรุ่น" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(rrs)));

  const { listRejectReasons } = await import("./reject-reasons");
  const result = await listRejectReasons("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "RR-OOS");
  assert.equal(result.items[1].nameTh, "ชำรุดเสียหาย");
  assert.equal(result.items[2].code, "RR-WRONG");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getRejectReason / createRejectReason / updateRejectReason / deactivateRejectReason / restoreRejectReason
// ---------------------------------------------------------------------------

test("getRejectReason GETs /reject-reasons/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeRejectReasonFixture());
  });

  const { getRejectReason } = await import("./reject-reasons");
  const result = await getRejectReason("test-token", "rr-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/reject-reasons/rr-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "rr-1");
});

test("createRejectReason POSTs to /reject-reasons with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeRejectReasonFixture({ code: "NEW" }));
  });

  const { createRejectReason } = await import("./reject-reasons");
  const result = await createRejectReason("test-token", {
    code: "NEW",
    nameTh: "เหตุผลใหม่",
    nameEn: "New Reason",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/reject-reasons");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "NEW");
  assert.equal(body.nameTh, "เหตุผลใหม่");
  assert.equal(body.nameEn, "New Reason");
  assert.equal(result.code, "NEW");
});

test("updateRejectReason PATCHes /reject-reasons/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeRejectReasonFixture({ nameTh: "เหตุผล (แก้ไข)" }));
  });

  const { updateRejectReason } = await import("./reject-reasons");
  const result = await updateRejectReason("test-token", "rr-1", {
    nameTh: "เหตุผล (แก้ไข)",
    updatedAt: "2026-09-09T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/reject-reasons/rr-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "เหตุผล (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-09T00:00:00.000Z");
  assert.equal(result.nameTh, "เหตุผล (แก้ไข)");
});

test("deactivateRejectReason DELETEs /reject-reasons/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeRejectReasonFixture({ isActive: false }));
  });

  const { deactivateRejectReason } = await import("./reject-reasons");
  const result = await deactivateRejectReason("test-token", "rr-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/reject-reasons/rr-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreRejectReason PATCHes /reject-reasons/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeRejectReasonFixture({ isActive: true }));
  });

  const { restoreRejectReason } = await import("./reject-reasons");
  const result = await restoreRejectReason("test-token", "rr-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/reject-reasons/rr-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});
