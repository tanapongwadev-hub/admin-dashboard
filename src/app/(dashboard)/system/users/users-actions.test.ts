// Tests for the `perform*` helpers in `actions.ts` (the /system/users page).
// Same pattern as system/menus/menus-actions.test.ts: mock `globalThis.fetch`
// and let the real `apiFetch` build the request.

import test, { type TestContext } from "node:test";
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

type Call = { url: string; init?: RequestInit };

function recordFetch(t: TestContext, responses: Response[]) {
  const calls: Call[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return responses.shift() ?? jsonResponse(500, {});
  });
  return calls;
}

const assignment = {
  id: "a1",
  departmentId: "d2",
  roleId: "r1",
  isActive: true,
  expiredAt: null,
  department: { id: "d2", code: "PS", nameTh: "แผนกพ่นสี" },
  role: { id: "r1", code: "USER", nameTh: "ผู้ใช้" },
};

test("performCreateUser POSTs the user with its first assignment", async (t) => {
  const calls = recordFetch(t, [jsonResponse(201, { id: "9", username: "somchai" })]);
  const { performCreateUser } = await import("./actions");
  const result = await performCreateUser("tok", {
    username: "somchai",
    password: "secret1",
    firstName: "สมชาย",
    lastName: "ใจดี",
    assignments: [{ departmentId: "d1", roleId: "r1" }],
  });

  assert.equal(result.status, "success");
  assert.equal(calls[0].url, "http://api.example.test/api/v1/users");
  assert.equal(calls[0].init?.method, "POST");
  assert.equal(new Headers(calls[0].init?.headers).get("authorization"), "Bearer tok");
  const body = JSON.parse(calls[0].init?.body as string);
  assert.deepEqual(body.assignments, [{ departmentId: "d1", roleId: "r1" }]);
});

test("performUpdateAssignment never sends permissionIds, then reloads the list", async (t) => {
  const calls = recordFetch(t, [jsonResponse(200, assignment), jsonResponse(200, [assignment])]);
  const { performUpdateAssignment } = await import("./actions");
  const result = await performUpdateAssignment("tok", "9", "a1", { departmentId: "d2", roleId: "r1" });

  assert.equal(result.status, "success");
  assert.equal(calls[0].init?.method, "PATCH");
  assert.match(calls[0].url, /\/users\/9\/assignments\/a1$/);
  // Omitting permissionIds is what keeps the ALLOW/DENY overrides in cps-api.
  assert.deepEqual(JSON.parse(calls[0].init?.body as string), { departmentId: "d2", roleId: "r1" });
  assert.match(calls[1].url, /\/users\/9\/assignments$/);
  assert.deepEqual((result as { assignments: unknown[] }).assignments, [assignment]);
});

test("performSetUserStatus surfaces the last-super-admin refusal in Thai", async (t) => {
  recordFetch(t, [jsonResponse(400, { message: "Cannot disable the last super admin" })]);
  const { performSetUserStatus } = await import("./actions");
  const result = await performSetUserStatus("tok", "1", false);

  assert.deepEqual(result, { status: "error", message: "ปิดใช้งาน Super Admin คนสุดท้ายไม่ได้" });
});

test("performResetPassword posts newPassword to the reset endpoint", async (t) => {
  const calls = recordFetch(t, [jsonResponse(201, { message: "ok" })]);
  const { performResetPassword } = await import("./actions");
  const result = await performResetPassword("tok", "9", "newpass1");

  assert.equal(result.status, "success");
  assert.match(calls[0].url, /\/users\/9\/reset-password$/);
  assert.deepEqual(JSON.parse(calls[0].init?.body as string), { newPassword: "newpass1" });
});

test("a network failure becomes the shared Thai connection message", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("fetch failed");
  });
  const { performDeleteUser } = await import("./actions");
  const result = await performDeleteUser("tok", "9");

  assert.deepEqual(result, { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" });
});
