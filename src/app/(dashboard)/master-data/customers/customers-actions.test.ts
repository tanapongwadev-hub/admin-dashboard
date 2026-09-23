// Tests for the Server Actions in `actions.ts` — the actual CRUD layer
// for `/master-data/customers`. Same pattern as
// `master-data/material-types/material-types-actions.test.ts`.

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

function makeCreatePayload() {
  return {
    code: "CUS-A",
    nameTh: "บริษัท ลูกค้า ตัวอย่าง จำกัด",
    nameEn: "Example Customer Co., Ltd.",
    email: "contact@customer.example",
  };
}

function makeUpdatePayload() {
  return { nameTh: "ลูกค้า (แก้ไข)", updatedAt: "2026-09-20T00:00:00.000Z" };
}

// ---------------------------------------------------------------------------
// performCreateCustomer
// ---------------------------------------------------------------------------

test("performCreateCustomer POSTs to /customers and revalidates the list path on 200", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeCustomerFixture());
  });

  const { performCreateCustomer } = await import("./actions");
  const result = await performCreateCustomer("test-token", makeCreatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/customers");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
});

test("performCreateCustomer returns 'conflict' on 409 (duplicate code)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "Customer code already exists" }));

  const { performCreateCustomer } = await import("./actions");
  const result = await performCreateCustomer("test-token", makeCreatePayload());

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่นแล้ว/);
});

test("performCreateCustomer returns the joined API error message on non-2xx", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(500, { message: ["DB error", "Timeout"] }));

  const { performCreateCustomer } = await import("./actions");
  const result = await performCreateCustomer("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.match((result as { message: string }).message, /ระบบขัดข้องชั่วคราว/);
});

test("performCreateCustomer returns a Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("ECONNREFUSED"); });

  const { performCreateCustomer } = await import("./actions");
  const result = await performCreateCustomer("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// performUpdateCustomer
// ---------------------------------------------------------------------------

test("performUpdateCustomer PATCHes /customers/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeCustomerFixture({ nameTh: "ลูกค้า (แก้ไข)" }));
  });

  const { performUpdateCustomer } = await import("./actions");
  const result = await performUpdateCustomer("test-token", "cus-1", makeUpdatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/customers/cus-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "ลูกค้า (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-20T00:00:00.000Z");
});

test("performUpdateCustomer returns 'conflict' on 409 (stale updatedAt)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "stale" }));

  const { performUpdateCustomer } = await import("./actions");
  const result = await performUpdateCustomer("test-token", "cus-1", makeUpdatePayload());

  assert.equal(result.status, "conflict");
});

// ---------------------------------------------------------------------------
// performDeactivateCustomer / performRestoreCustomer (soft delete)
// ---------------------------------------------------------------------------

test("performDeactivateCustomer DELETEs /customers/{id} and returns the deactivated customer", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeCustomerFixture({ isActive: false }));
  });

  const { performDeactivateCustomer } = await import("./actions");
  const result = await performDeactivateCustomer("test-token", "cus-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/customers/cus-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal((result as { customer: { isActive: boolean } }).customer.isActive, false);
});

test("performRestoreCustomer PATCHes /customers/{id}/restore and returns the reactivated customer", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeCustomerFixture({ isActive: true }));
  });

  const { performRestoreCustomer } = await import("./actions");
  const result = await performRestoreCustomer("test-token", "cus-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/customers/cus-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal((result as { customer: { isActive: boolean } }).customer.isActive, true);
});

// ---------------------------------------------------------------------------
// Public wrappers
// ---------------------------------------------------------------------------

test("all public Customer action wrappers forward to their perform* helpers", async (t) => {
  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    fetchCount++;
    const url = String(input);
    if (init?.method === "POST") return jsonResponse(201, makeCustomerFixture());
    if (init?.method === "PATCH" && url.endsWith("/restore")) return jsonResponse(200, makeCustomerFixture({ isActive: true }));
    if (init?.method === "PATCH") return jsonResponse(200, makeCustomerFixture({ nameTh: "x" }));
    if (init?.method === "DELETE") return jsonResponse(200, makeCustomerFixture({ isActive: false }));
    return jsonResponse(200, makeCustomerFixture());
  });

  const {
    createCustomerAction,
    updateCustomerAction,
    deactivateCustomerAction,
    restoreCustomerAction,
  } = await import("./actions");

  await assert.rejects(() => createCustomerAction(makeCreatePayload()));
  await assert.rejects(() => updateCustomerAction("cus-1", makeUpdatePayload()));
  await assert.rejects(() => deactivateCustomerAction("cus-1"));
  await assert.rejects(() => restoreCustomerAction("cus-1"));

  assert.equal(fetchCount, 0, "fetch must not be called when access token is missing");
});
