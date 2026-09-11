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
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "status-1",
    code: "PENDING",
    nameTh: "รอดำเนินการ",
    nameEn: "Pending",
    color: "warning",
    module: "materials-receiving",
    isDefault: true,
    sortOrder: 10,
    description: null,
    isActive: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-09-11T00:00:00.000Z",
    updatedAt: "2026-09-11T00:00:00.000Z",
    ...overrides,
  };
}

const createPayload = {
  code: "PENDING",
  nameTh: "รอดำเนินการ",
  color: "warning" as const,
  module: "materials-receiving",
  isDefault: true,
  sortOrder: 10,
};

test("performCreateStatusItem returns the created status item", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(201, fixture());
  });

  const { performCreateStatusItem } = await import("./actions");
  const result = await performCreateStatusItem("test-token", createPayload);

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/status-items");
  assert.equal((result as { statusItem: { color: string } }).statusItem.color, "warning");
});

test("performUpdateStatusItem maps a stale updatedAt response to conflict", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "Status item has been updated" }));

  const { performUpdateStatusItem } = await import("./actions");
  const result = await performUpdateStatusItem("test-token", "status-1", {
    color: "success",
    updatedAt: "2026-09-11T00:00:00.000Z",
  });

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่นแล้ว/);
});

test("perform status-item deactivate and restore use soft-delete endpoints", async (t) => {
  const requests: Array<[string, string | undefined]> = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requests.push([String(input), init?.method]);
    return jsonResponse(200, fixture({ isActive: init?.method !== "DELETE" }));
  });

  const { performDeactivateStatusItem, performRestoreStatusItem } = await import("./actions");
  const deactivated = await performDeactivateStatusItem("test-token", "status-1");
  const restored = await performRestoreStatusItem("test-token", "status-1");

  assert.equal(deactivated.status, "success");
  assert.equal(restored.status, "success");
  assert.deepEqual(requests, [
    ["http://api.example.test/api/v1/status-items/status-1", "DELETE"],
    ["http://api.example.test/api/v1/status-items/status-1/restore", "PATCH"],
  ]);
});

test("public status-item actions stop before fetch when the session cookie is missing", async (t) => {
  let fetchCount = 0;
  t.mock.method(globalThis, "fetch", async () => {
    fetchCount++;
    return jsonResponse(200, fixture());
  });

  const { createStatusItemAction, updateStatusItemAction, deactivateStatusItemAction, restoreStatusItemAction } =
    await import("./actions");
  await assert.rejects(() => createStatusItemAction(createPayload));
  await assert.rejects(() => updateStatusItemAction("status-1", { updatedAt: "2026-09-11T00:00:00.000Z" }));
  await assert.rejects(() => deactivateStatusItemAction("status-1"));
  await assert.rejects(() => restoreStatusItemAction("status-1"));
  assert.equal(fetchCount, 0);
});
