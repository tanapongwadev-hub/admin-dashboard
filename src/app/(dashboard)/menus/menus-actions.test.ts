// Tests for the Server Actions in `actions.ts` — the menu tree save
// and refresh endpoints (used by menu-tree-editor.tsx and AGENTS.md §
// Menu management). Follows the same pattern as
// `materials/pc/materials-pc-actions.test.ts` and
// `products/products-actions.test.ts`:
//   - mock `globalThis.fetch` with `t.mock.method`
//   - test the `perform*` helpers (not the cookie-reading wrappers)
//   - the public `*Action` wrappers are cookie-reading one-liners

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

// ---------------------------------------------------------------------------
// performSaveMenuOrder
// ---------------------------------------------------------------------------

test("performSaveMenuOrder PATCHes the reorder endpoint and returns the new version", async (t) => {
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (_input: string | URL | Request, init?: RequestInit) => {
    requestInit = init;
    return jsonResponse(200, { version: "v2-new-hash" });
  });

  const { performSaveMenuOrder } = await import("./actions");
  const result = await performSaveMenuOrder("test-token", "v1-old-hash", [
    { id: "menu-1", parentId: null, sortOrder: 0 },
    { id: "menu-2", parentId: null, sortOrder: 1 },
  ]);

  assert.equal(result.status, "success");
  assert.equal((result as { version: string }).version, "v2-new-hash");
  assert.equal(requestInit?.method, "PATCH");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  // The body shape is what cps-api expects on its PATCH /menus/reorder.
  assert.equal(body.version, "v1-old-hash");
  assert.equal(body.items.length, 2);
  assert.deepEqual(body.items[0], { id: "menu-1", parentId: null, sortOrder: 0 });
});

test("performSaveMenuOrder returns 'conflict' on 409 (stale version, optimistic-concurrency)", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    jsonResponse(409, { message: "Version mismatch" })
  );

  const { performSaveMenuOrder } = await import("./actions");
  const result = await performSaveMenuOrder("test-token", "stale-version", []);

  assert.equal(result.status, "conflict");
  assert.match((result as { message: string }).message, /มีคนอื่นเปลี่ยนแปลง/);
});

test("performSaveMenuOrder returns the API error message on other non-2xx", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    jsonResponse(422, { message: "Invalid menu item id" })
  );

  const { performSaveMenuOrder } = await import("./actions");
  const result = await performSaveMenuOrder("test-token", "v1", []);

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "Invalid menu item id");
});

test("performSaveMenuOrder returns the generic Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("ECONNREFUSED");
  });

  const { performSaveMenuOrder } = await import("./actions");
  const result = await performSaveMenuOrder("test-token", "v1", []);

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// performRefreshMenuTree
// ---------------------------------------------------------------------------

test("performRefreshMenuTree GETs the management tree and returns version + menus", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return jsonResponse(200, {
      version: "v3-current-hash",
      menus: [
        { id: "menu-1", code: "dashboard", name: "Dashboard", nameEn: "Dashboard" },
        { id: "menu-2", code: "products", name: "Products", nameEn: "Products" },
      ],
    });
  });

  const { performRefreshMenuTree } = await import("./actions");
  const result = await performRefreshMenuTree("test-token");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/menus/management-tree");
  assert.equal((result as { version: string }).version, "v3-current-hash");
  assert.equal((result as { menus: unknown[] }).menus.length, 2);
});

test("performRefreshMenuTree returns the generic Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("ECONNREFUSED");
  });

  const { performRefreshMenuTree } = await import("./actions");
  const result = await performRefreshMenuTree("test-token");

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

// ---------------------------------------------------------------------------
// CRUD mutations
// ---------------------------------------------------------------------------

test("performCreateMenu POSTs a menu then returns the refreshed management tree", async (t) => {
  const requests: Array<{ url: string; method: string; body?: unknown }> = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    });
    if (init?.method === "POST") return jsonResponse(201, { id: "menu-3" });
    return jsonResponse(200, { version: "v4", menus: [] });
  });

  const { performCreateMenu } = await import("./actions");
  const result = await performCreateMenu("test-token", {
    code: "REPORTS",
    nameTh: "รายงาน",
    nameEn: "Reports",
    menuType: "MAIN",
    path: "/reports",
    sortOrder: 2,
  });

  assert.equal(result.status, "success");
  assert.deepEqual(requests.map((request) => request.method), ["POST", "GET"]);
  assert.equal(requests[0].url, "http://api.example.test/api/v1/menus");
  assert.deepEqual(requests[0].body, {
    code: "REPORTS",
    nameTh: "รายงาน",
    nameEn: "Reports",
    menuType: "MAIN",
    path: "/reports",
    sortOrder: 2,
  });
});

test("performUpdateMenu PATCHes editable fields then returns the refreshed tree", async (t) => {
  const methods: string[] = [];
  t.mock.method(globalThis, "fetch", async (_input: string | URL | Request, init?: RequestInit) => {
    methods.push(init?.method ?? "GET");
    if (init?.method === "PATCH") return jsonResponse(200, { id: "menu-1" });
    return jsonResponse(200, { version: "v5", menus: [] });
  });

  const { performUpdateMenu } = await import("./actions");
  const result = await performUpdateMenu("test-token", "menu-1", {
    nameTh: "แดชบอร์ดใหม่",
    isVisible: false,
  });

  assert.equal(result.status, "success");
  assert.deepEqual(methods, ["PATCH", "GET"]);
});

test("performDeleteMenu surfaces the backend guard for menus with permissions", async (t) => {
  let requestUrl = "";
  let requestMethod = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestMethod = init?.method ?? "GET";
    return jsonResponse(400, { message: "Cannot delete menu that still has permissions" });
  });

  const { performDeleteMenu } = await import("./actions");
  const result = await performDeleteMenu("test-token", "menu-1");

  assert.equal(result.status, "error");
  assert.equal(requestUrl, "http://api.example.test/api/v1/menus/menu-1");
  assert.equal(requestMethod, "DELETE");
  assert.equal(
    (result as { message: string }).message,
    "ยังลบเมนูที่มี permission ผูกอยู่ไม่ได้ กรุณาถอด permission ก่อน"
  );
});

// ---------------------------------------------------------------------------
// Cross-cutting
// ---------------------------------------------------------------------------

test("the public wrappers all forward to the matching perform* helper", async () => {
  // Sanity check that the public/export split is intact — runtime behavior
  // is exercised through the perform* tests above.
  const actionsModule = await import("./actions");
  const expectedPairs: Array<[string, string]> = [
    ["saveMenuOrderAction", "performSaveMenuOrder"],
    ["refreshMenuTreeAction", "performRefreshMenuTree"],
    ["createMenuAction", "performCreateMenu"],
    ["updateMenuAction", "performUpdateMenu"],
    ["deleteMenuAction", "performDeleteMenu"],
  ];
  for (const [publicName, helperName] of expectedPairs) {
    assert.equal(
      typeof (actionsModule as Record<string, unknown>)[publicName],
      "function",
      `${publicName} must be exported as a function (verify the public/export split is intact)`
    );
    assert.equal(
      typeof (actionsModule as Record<string, unknown>)[helperName],
      "function",
      `${helperName} must be exported (the public wrapper delegates to it)`
    );
  }
});
