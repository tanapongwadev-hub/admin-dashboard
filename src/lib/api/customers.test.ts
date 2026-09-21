// Tests for the API functions in `src/lib/api/customers.ts` — the master
// data client for the `/master-data/customers` admin page. Mirrors
// cps-api's real `/customers` module (see cps-api/API_ENDPOINTS.md § 5.1
// and cps-api/src/modules/customers/customers.controller.ts). Same
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

function makeCustomerFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "cus-1",
    code: "CUS-A",
    nameTh: "บริษัท ลูกค้า ตัวอย่าง จำกัด",
    nameEn: "Example Customer Co., Ltd.",
    taxId: "0105548012345",
    contactName: "สมหญิง จัดการดี",
    telephone: "02-123-4567",
    email: "contact@customer.example",
    address: "123 ถนนตัวอย่าง",
    isActive: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
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
// listCustomers — URL + headers
// ---------------------------------------------------------------------------

test("listCustomers GETs /customers with no query string when called with no params", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makePaginatedFixture([makeCustomerFixture()]));
  });

  const { listCustomers } = await import("./customers");
  const result = await listCustomers("test-token");

  assert.equal(requestUrl, "http://api.example.test/api/v1/customers");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(requestHeaders?.get("content-type"), "application/json");
  assert.equal(result.items.length, 1);
});

test("listCustomers serializes every defined param into the query string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listCustomers } = await import("./customers");
  await listCustomers("test-token", {
    page: 2,
    limit: 25,
    search: "demo",
    isActive: true,
    sortBy: "nameTh",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/customers");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("search"), "demo");
  assert.equal(url.searchParams.get("isActive"), "true");
  assert.equal(url.searchParams.get("sortBy"), "nameTh");
  assert.equal(url.searchParams.get("sortOrder"), "asc");
});

test("listCustomers skips params that are undefined, null, or empty string", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listCustomers } = await import("./customers");
  await listCustomers("test-token", {
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

test("listCustomers passes isActive=false correctly (explicit false, not omitted)", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, makePaginatedFixture());
  });

  const { listCustomers } = await import("./customers");
  await listCustomers("test-token", { isActive: false });

  const url = new URL(requestUrl);
  assert.equal(url.searchParams.get("isActive"), "false");
});

// ---------------------------------------------------------------------------
// listCustomers — response parsing
// ---------------------------------------------------------------------------

test("listCustomers returns the parsed paginated result (items + meta)", async (t) => {
  const rrs = [
    makeCustomerFixture({ id: "cus-1", code: "CUS-A" }),
    makeCustomerFixture({ id: "cus-2", code: "CUS-B" }),
    makeCustomerFixture({ id: "cus-3", code: "CUS-C" }),
  ];
  t.mock.method(globalThis, "fetch", async () => jsonResponse(200, makePaginatedFixture(rrs)));

  const { listCustomers } = await import("./customers");
  const result = await listCustomers("test-token");

  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].code, "CUS-A");
  assert.equal(result.items[1].code, "CUS-B");
  assert.equal(result.items[2].code, "CUS-C");
  assert.equal(result.meta.totalItems, 3);
  assert.equal(result.meta.page, 1);
  assert.equal(result.meta.limit, 20);
  assert.equal(result.meta.totalPages, 1);
});

// ---------------------------------------------------------------------------
// getCustomer / createCustomer / updateCustomer / deactivateCustomer / restoreCustomer
// ---------------------------------------------------------------------------

test("getCustomer GETs /customers/{id} with the Authorization header", async (t) => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    return jsonResponse(200, makeCustomerFixture());
  });

  const { getCustomer } = await import("./customers");
  const result = await getCustomer("test-token", "cus-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/customers/cus-1");
  assert.equal(requestHeaders?.get("authorization"), "Bearer test-token");
  assert.equal(result.id, "cus-1");
});

test("createCustomer POSTs to /customers with a JSON body and Authorization header", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeCustomerFixture({ code: "NEW" }));
  });

  const { createCustomer } = await import("./customers");
  const result = await createCustomer("test-token", {
    code: "NEW",
    nameTh: "ลูกค้าใหม่",
    nameEn: "New Customer",
    taxId: "0105548099999",
    contactName: "ผู้ติดต่อ",
    telephone: "02-999-9999",
    email: "test@customer.example",
    address: "1 ถนนทดสอบ",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/customers");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.code, "NEW");
  assert.equal(body.nameTh, "ลูกค้าใหม่");
  assert.equal(body.email, "test@customer.example");
  assert.equal(result.code, "NEW");
});

test("updateCustomer PATCHes /customers/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeCustomerFixture({ nameTh: "ลูกค้า (แก้ไข)" }));
  });

  const { updateCustomer } = await import("./customers");
  const result = await updateCustomer("test-token", "cus-1", {
    nameTh: "ลูกค้า (แก้ไข)",
    updatedAt: "2026-09-20T00:00:00.000Z",
  });

  assert.equal(requestUrl, "http://api.example.test/api/v1/customers/cus-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "ลูกค้า (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-20T00:00:00.000Z");
  assert.equal(result.nameTh, "ลูกค้า (แก้ไข)");
});

test("deactivateCustomer DELETEs /customers/{id} (soft delete per backend contract)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeCustomerFixture({ isActive: false }));
  });

  const { deactivateCustomer } = await import("./customers");
  const result = await deactivateCustomer("test-token", "cus-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/customers/cus-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal(result.isActive, false);
});

test("restoreCustomer PATCHes /customers/{id}/restore", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeCustomerFixture({ isActive: true }));
  });

  const { restoreCustomer } = await import("./customers");
  const result = await restoreCustomer("test-token", "cus-1");

  assert.equal(requestUrl, "http://api.example.test/api/v1/customers/cus-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal(result.isActive, true);
});