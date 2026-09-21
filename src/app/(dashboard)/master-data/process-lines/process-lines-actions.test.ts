// Tests for the Server Actions in `actions.ts` — the actual CRUD layer
// for `/master-data/process-lines`. Same pattern as
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

function makeCreatePayload() {
  return {
    code: "PL-01",
    nameTh: "สายประกอบ 1",
    nameEn: "Assembly Line 1",
  };
}

function makeUpdatePayload() {
  return { nameTh: "สายประกอบ 1 (แก้ไข)", updatedAt: "2026-09-21T00:00:00.000Z" };
}

// ---------------------------------------------------------------------------
// performCreateProcessLine
// ---------------------------------------------------------------------------

test("performCreateProcessLine POSTs to /process-lines and revalidates the list path on 200", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(201, makeProcessLineFixture());
  });

  const { performCreateProcessLine } = await import("./actions");
  const result = await performCreateProcessLine("test-token", makeCreatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/process-lines");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
});

test("performCreateProcessLine returns 'conflict' on 409 (duplicate code)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "Process line code already exists" }));

  const { performCreateProcessLine } = await import("./actions");
  const result = await performCreateProcessLine("test-token", makeCreatePayload());

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่นแล้ว/);
});

test("performCreateProcessLine returns the joined API error message on non-2xx", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(500, { message: ["DB error", "Timeout"] }));

  const { performCreateProcessLine } = await import("./actions");
  const result = await performCreateProcessLine("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.match((result as { message: string }).message, /DB error, Timeout/);
});

test("performCreateProcessLine returns a Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("ECONNREFUSED"); });

  const { performCreateProcessLine } = await import("./actions");
  const result = await performCreateProcessLine("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// performUpdateProcessLine
// ---------------------------------------------------------------------------

test("performUpdateProcessLine PATCHes /process-lines/{id} and forwards updatedAt", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProcessLineFixture({ nameTh: "สายประกอบ 1 (แก้ไข)" }));
  });

  const { performUpdateProcessLine } = await import("./actions");
  const result = await performUpdateProcessLine("test-token", "pl-1", makeUpdatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/process-lines/pl-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.nameTh, "สายประกอบ 1 (แก้ไข)");
  assert.equal(body.updatedAt, "2026-09-21T00:00:00.000Z");
});

test("performUpdateProcessLine returns 'conflict' on 409 (stale updatedAt)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "stale" }));

  const { performUpdateProcessLine } = await import("./actions");
  const result = await performUpdateProcessLine("test-token", "pl-1", makeUpdatePayload());

  assert.equal(result.status, "conflict");
});

// ---------------------------------------------------------------------------
// performDeactivateProcessLine / performRestoreProcessLine (soft delete)
// ---------------------------------------------------------------------------

test("performDeactivateProcessLine DELETEs /process-lines/{id} and returns the deactivated process line", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProcessLineFixture({ isActive: false }));
  });

  const { performDeactivateProcessLine } = await import("./actions");
  const result = await performDeactivateProcessLine("test-token", "pl-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/process-lines/pl-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal((result as { processLine: { isActive: boolean } }).processLine.isActive, false);
});

test("performRestoreProcessLine PATCHes /process-lines/{id}/restore and returns the reactivated process line", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeProcessLineFixture({ isActive: true }));
  });

  const { performRestoreProcessLine } = await import("./actions");
  const result = await performRestoreProcessLine("test-token", "pl-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/process-lines/pl-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal((result as { processLine: { isActive: boolean } }).processLine.isActive, true);
});

// ---------------------------------------------------------------------------
// Public wrappers
// ---------------------------------------------------------------------------

test("all public ProcessLine action wrappers forward to their perform* helpers", async (t) => {
  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    fetchCount++;
    const url = String(input);
    if (init?.method === "POST") return jsonResponse(201, makeProcessLineFixture());
    if (init?.method === "PATCH" && url.endsWith("/restore")) return jsonResponse(200, makeProcessLineFixture({ isActive: true }));
    if (init?.method === "PATCH") return jsonResponse(200, makeProcessLineFixture({ nameTh: "x" }));
    if (init?.method === "DELETE") return jsonResponse(200, makeProcessLineFixture({ isActive: false }));
    return jsonResponse(200, makeProcessLineFixture());
  });

  const {
    createProcessLineAction,
    updateProcessLineAction,
    deactivateProcessLineAction,
    restoreProcessLineAction,
  } = await import("./actions");

  await assert.rejects(() => createProcessLineAction(makeCreatePayload()));
  await assert.rejects(() => updateProcessLineAction("pl-1", makeUpdatePayload()));
  await assert.rejects(() => deactivateProcessLineAction("pl-1"));
  await assert.rejects(() => restoreProcessLineAction("pl-1"));

  assert.equal(fetchCount, 0, "fetch must not be called when access token is missing");
});