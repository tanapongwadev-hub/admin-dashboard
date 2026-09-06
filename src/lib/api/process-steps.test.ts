// Tests for the `listProcessSteps` API function in
// `src/lib/api/process-steps.ts` — the master data list that feeds the
// Product Workflow step picker in `products-wizard-dialog.tsx`. Full
// process-step CRUD exists on the backend (mirrors /delivery-types
// per `cps-api/API_ENDPOINTS.md` § 16) but this app only needs the read
// side for the wizard's dropdown, so this file only covers the one
// function the frontend actually calls. Same fetch-mock pattern as
// `material-pc-image-upload.test.ts` and `materials-pc-actions.test.ts`.

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

function makeStepFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "step-1",
    code: "WELD",
    nameTh: "เชื่อม",
    nameEn: "Weld",
    description: null,
    isActive: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    ...overrides,
  };
}

function makePaginatedFixture(items: unknown[] = []) {
  return {
    items,
    meta: { page: 1, limit: 100, totalItems: items.length, totalPages: 1 },
  };
}

// ---------------------------------------------------------------------------
// listProcessSteps — URL + headers
// ---------------------------------------------------------------------------

test("listProcessSteps GETs /process-steps with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeStepFixture()]));
  });

  const { listProcessSteps } = await import("./process-steps");
  const result = await listProcessSteps("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/process-steps");
  // When listProcessSteps passes no init options, fetch() is called with
  // just the URL (no second arg) — the runtime defaults the method to GET,
  // but our mock's `init` param is `undefined`. The Authorization header
  // is set regardless (apiFetch merges it in unconditionally for authenticated
  // calls), so checking the header is the reliable way to assert auth was
  // sent on this code path.
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  // apiFetch always sets Content-Type: application/json for non-FormData
  // calls (read OR write). This differs from the multipart upload path
  // (see material-pc-image-upload.test.ts) which omits Content-Type so
  // the runtime generates the multipart boundary. listProcessSteps is a
  // GET with a JSON-friendly default — not a bug, just the apiFetch
  // contract.
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  // Sanity: the result still parses correctly.
  assert.equal(result.items.length, 1);
});

test("listProcessSteps serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProcessSteps } = await import("./process-steps");
  await listProcessSteps("test-token", {
    page: 2,
    limit: 25,
    search: "weld",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/process-steps");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "weld");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listProcessSteps skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProcessSteps } = await import("./process-steps");
  await listProcessSteps("test-token", {
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

test("listProcessSteps passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listProcessSteps } = await import("./process-steps");
  await listProcessSteps("test-token", { isActive: false });

  const url = new URL(requestUrl);
  // The serializer uses `if (value === undefined || value === null || value === "") continue;`
  // — false passes all three, so it must be present in the query string.
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listProcessSteps — response parsing
// ---------------------------------------------------------------------------

test("listProcessSteps returns the parsed paginated result (items + meta)", async (t) => {
  const steps = [
    makeStepFixture({ id: "step-1", code: "WELD", nameTh: "เชื่อม" }),
    makeStepFixture({ id: "step-2", code: "CNC", nameTh: "กัด" }),
    makeStepFixture({ id: "step-3", code: "QC", nameTh: "ตรวจสอบ" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(steps)));

  const { listProcessSteps } = await import("./process-steps");
  const result = await listProcessSteps("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "WELD");
  assert.equal(result.items[1].code, "CNC");
  assert.equal(result.items[2].code, "QC");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 100);
  assert.equal(result.meta.totalPages, 1);
});
