// Tests for the API functions in `src/lib/api/material-models.ts` — the
// master data client for the `/master-data/material-models` admin page.
// Mirrors cps-api's real `/material-models` module (see
// cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/material-models/material-models.controller.ts). Same
// fetch-mock + URL/headers assertion pattern as `loading-points.test.ts`,
// `delivery-types.test.ts`, and `reject-reasons.test.ts`.

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

function makeMaterialModelFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "mm-1",
    code: "MM-A1",
    nameTh: "รุ่น A1",
    nameEn: "Model A1",
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
// listMaterialModels — URL + headers
// ---------------------------------------------------------------------------

test("listMaterialModels GETs /material-models with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeMaterialModelFixture()]));
  });

  const { listMaterialModels } = await import("./material-models");
  const result = await listMaterialModels("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-models");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listMaterialModels serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listMaterialModels } = await import("./material-models");
  await listMaterialModels("test-token", {
    page: 2,
    limit: 25,
    search: "a1",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/material-models");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "a1");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listMaterialModels skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listMaterialModels } = await import("./material-models");
  await listMaterialModels("test-token", {
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

test("listMaterialModels passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listMaterialModels } = await import("./material-models");
  await listMaterialModels("test-token", { isActive: false });

  const url = new URL(requestUrl);
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listMaterialModels — response parsing
// ---------------------------------------------------------------------------

test("listMaterialModels returns the parsed paginated result (items + meta)", async (t) => {
  const mms = [
    makeMaterialModelFixture({ id: "mm-1", code: "MM-A1", nameTh: "รุ่น A1" }),
    makeMaterialModelFixture({ id: "mm-2", code: "MM-B2", nameTh: "รุ่น B2" }),
    makeMaterialModelFixture({ id: "mm-3", code: "MM-C3", nameTh: "รุ่น C3" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(mms)));

  const { listMaterialModels } = await import("./material-models");
  const result = await listMaterialModels("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "MM-A1");
  assert.equal(result.items[1].nameTh, "รุ่น B2");
  assert.equal(result.items[2].code, "MM-C3");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getMaterialModel / createMaterialModel / updateMaterialModel / deactivateMaterialModel / restoreMaterialModel
// ---------------------------------------------------------------------------

test("getMaterialModel GETs /material-models/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeMaterialModelFixture());
  });

  const { getMaterialModel } = await import("./material-models");
  const result = await getMaterialModel("test-token", "mm-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-models/mm-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "mm-1");
});

test("createMaterialModel POSTs to /material-models with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeMaterialModelFixture({ code: "NEW" }));
  });

  const { createMaterialModel } = await import("./material-models");
  const result = await createMaterialModel("test-token", {
    code: "NEW",
    nameTh: "รุ่นใหม่",
    nameEn: "New Model",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-models");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "NEW");
  assert.equal(body.nameTh, "รุ่นใหม่");
  assert.equal(body.nameEn, "New Model");
  assert.equal(result.code, "NEW");
});

test("updateMaterialModel PATCHes /material-models/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialModelFixture({ nameTh: "รุ่น A1 (แก้ไข)" }));
  });

  const { updateMaterialModel } = await import("./material-models");
  const result = await updateMaterialModel("test-token", "mm-1", {
    nameTh: "รุ่น A1 (แก้ไข)",
    updatedAt: "2026-09-09T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-models/mm-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "รุ่น A1 (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-09T00:00:00.000Z");
  assert.equal(result.nameTh, "รุ่น A1 (แก้ไข)");
});

test("deactivateMaterialModel DELETEs /material-models/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialModelFixture({ isActive: false }));
  });

  const { deactivateMaterialModel } = await import("./material-models");
  const result = await deactivateMaterialModel("test-token", "mm-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-models/mm-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreMaterialModel PATCHes /material-models/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialModelFixture({ isActive: true }));
  });

  const { restoreMaterialModel } = await import("./material-models");
  const result = await restoreMaterialModel("test-token", "mm-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/material-models/mm-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});
