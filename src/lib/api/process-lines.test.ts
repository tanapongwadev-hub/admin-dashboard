// Tests for the API functions in `src/lib/api/process-lines.ts` — the
// master data client for the `/master-data/process-lines` admin page.
// Mirrors cps-api's real `/process-lines` module (see
// cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/process-lines/process-lines.controller.ts). Same
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

function makeProcessLineFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "pl-1",
    code: "PL-01",
    nameTh: "สายประกอบ 1",
    nameEn: "Assembly Line 1",
    description: "สายหลัก",
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
// listProcessLines — URL + headers
// ---------------------------------------------------------------------------

test("listProcessLines GETs /process-lines with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeProcessLineFixture()]));
  });

  const { listProcessLines } = await import("./process-lines");
  const result = await listProcessLines("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/process-lines");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listProcessLines serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProcessLines } = await import("./process-lines");
  await listProcessLines("test-token", {
    page: 2,
    limit: 25,
    search: "ประกอบ",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/process-lines");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "ประกอบ");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listProcessLines skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProcessLines } = await import("./process-lines");
  await listProcessLines("test-token", {
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

test("listProcessLines passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProcessLines } = await import("./process-lines");
  await listProcessLines("test-token", { isActive: false });

  const url = new URL(requestUrl);
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listProcessLines — response parsing
// ---------------------------------------------------------------------------

test("listProcessLines returns the parsed paginated result (items + meta)", async (t) => {
  const rrs = [
    makeProcessLineFixture({ id: "pl-1", code: "PL-01", nameTh: "สายประกอบ 1" }),
    makeProcessLineFixture({ id: "pl-2", code: "PL-02", nameTh: "สายเชื่อม" }),
    makeProcessLineFixture({ id: "pl-3", code: "PL-03", nameTh: "สายพ่นสี" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(rrs)));

  const { listProcessLines } = await import("./process-lines");
  const result = await listProcessLines("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "PL-01");
  assert.equal(result.items[1].nameTh, "สายเชื่อม");
  assert.equal(result.items[2].code, "PL-03");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getProcessLine / createProcessLine / updateProcessLine / deactivateProcessLine / restoreProcessLine
// ---------------------------------------------------------------------------

test("getProcessLine GETs /process-lines/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeProcessLineFixture());
  });

  const { getProcessLine } = await import("./process-lines");
  const result = await getProcessLine("test-token", "pl-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/process-lines/pl-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "pl-1");
});

test("createProcessLine POSTs to /process-lines with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeProcessLineFixture({ code: "NEW" }));
  });

  const { createProcessLine } = await import("./process-lines");
  const result = await createProcessLine("test-token", {
    code: "NEW",
    nameTh: "สายใหม่",
    nameEn: "New Line",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/process-lines");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "NEW");
  assert.equal(body.nameTh, "สายใหม่");
  assert.equal(body.nameEn, "New Line");
  assert.equal(result.code, "NEW");
});

test("updateProcessLine PATCHes /process-lines/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProcessLineFixture({ nameTh: "สาย (แก้ไข)" }));
  });

  const { updateProcessLine } = await import("./process-lines");
  const result = await updateProcessLine("test-token", "pl-1", {
    nameTh: "สาย (แก้ไข)",
    updatedAt: "2026-09-21T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/process-lines/pl-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "สาย (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-21T00:00:00.000Z");
  assert.equal(result.nameTh, "สาย (แก้ไข)");
});

test("deactivateProcessLine DELETEs /process-lines/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProcessLineFixture({ isActive: false }));
  });

  const { deactivateProcessLine } = await import("./process-lines");
  const result = await deactivateProcessLine("test-token", "pl-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/process-lines/pl-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreProcessLine PATCHes /process-lines/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProcessLineFixture({ isActive: true }));
  });

  const { restoreProcessLine } = await import("./process-lines");
  const result = await restoreProcessLine("test-token", "pl-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/process-lines/pl-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});