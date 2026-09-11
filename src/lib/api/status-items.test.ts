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

function makeStatusItemFixture(overrides: Record<string, unknown> = {}) {
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

test("listStatusItems sends status-item filters and authorization", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, {
      items: [makeStatusItemFixture()],
      meta: { page: 2, limit: 20, totalItems: 1, totalPages: 1 },
    });
  });

  const { listStatusItems } = await import("./status-items");
  const result = await listStatusItems("test-token", {
    page: 2,
    limit: 20,
    search: "pending",
    isActive: false,
    module: "materials-receiving",
    sortBy: "sortOrder",
    sortOrder: "asc",
  });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/api/v1/status-items");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("search"), "pending");
  assert.equal(url.searchParams.get("isActive"), "false");
  assert.equal(url.searchParams.get("module"), "materials-receiving");
  assert.equal(url.searchParams.get("sortBy"), "sortOrder");
  assert.equal(new Headers(requestInit?.headers).get("authorization"), "Bearer test-token");
  assert.equal(result.items[0].isDefault, true);
});

test("status-item CRUD uses the backend /status-items contract", async (t) => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    return jsonResponse(200, makeStatusItemFixture({ isActive: init?.method !== "DELETE" }));
  });

  const { createStatusItem, updateStatusItem, deactivateStatusItem, restoreStatusItem } = await import("./status-items");
  await createStatusItem("test-token", {
    code: "PENDING",
    nameTh: "รอดำเนินการ",
    color: "warning",
    module: "materials-receiving",
    isDefault: true,
    sortOrder: 10,
  });
  await updateStatusItem("test-token", "status-1", {
    color: "info",
    updatedAt: "2026-09-11T00:00:00.000Z",
  });
  await deactivateStatusItem("test-token", "status-1");
  await restoreStatusItem("test-token", "status-1");

  assert.deepEqual(
    requests.map(({ url, init }) => [url, init?.method]),
    [
      ["http://api.example.test/api/v1/status-items", "POST"],
      ["http://api.example.test/api/v1/status-items/status-1", "PATCH"],
      ["http://api.example.test/api/v1/status-items/status-1", "DELETE"],
      ["http://api.example.test/api/v1/status-items/status-1/restore", "PATCH"],
    ]
  );
  assert.deepEqual(JSON.parse(requests[0].init?.body as string), {
    code: "PENDING",
    nameTh: "รอดำเนินการ",
    color: "warning",
    module: "materials-receiving",
    isDefault: true,
    sortOrder: 10,
  });
  assert.equal(JSON.parse(requests[1].init?.body as string).updatedAt, "2026-09-11T00:00:00.000Z");
});
