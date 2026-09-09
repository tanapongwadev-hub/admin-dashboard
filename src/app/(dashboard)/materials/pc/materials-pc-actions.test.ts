// Tests for the CRUD layer of `/materials/pc`. The Server Actions in
// `actions.ts` are thin wrappers (read cookie → call inner helper → return
// result) — the cookie-reading wrapper is one line and is exercised by
// manual/live verification. The actual CRUD logic (the part most likely
// to break) lives in the `perform*` helpers below, which take the
// accessToken as a parameter so tests can call them directly with a
// controlled token (avoids needing to mock `next/headers` — Node 24's
// `t.mock.module` is behind the `--experimental-test-module-mocks` flag
// and not reliably available across test runners).
//
// Pattern (same as `material-pc-image-upload.test.ts` for the API side):
//   - `process.env.API_BASE_URL` is set so `apiFetch` can build its URL
//   - `t.mock.method(globalThis, "fetch", ...)` returns canned responses
//     so the API call goes through the real `apiFetch` path; we can
//     assert on the request shape (URL, method, headers, body)
//   - The `revalidatePath` import is automatically picked up — the
//     `perform*` helpers just call it, no separate mock needed for
//     this round (we assert it doesn't throw, not its specific path,
//     since the helper is the only public surface and any future path
//     change would surface as a code review issue).

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

function makeMaterialFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "material-1",
    code: "MAT-PC-001",
    name: "อะคริลิคแผ่นใส 5mm",
    type: "PC" as const,
    materialType: "SHEET" as const,
    ratio: 4,
    unitId: "unit-1",
    deliveryTypeId: null,
    modelId: "model-1",
    loadingPointId: null,
    processLineName: null,
    scale: null,
    imagePath: null,
    specification: null,
    description: null,
    packingQuantity: 20,
    isActive: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    unit: null,
    model: null,
    deliveryType: null,
    loadingPoint: null,
    suppliers: [],
    ...overrides,
  };
}

function makeCreatePayload() {
  return {
    code: "MAT-PC-001",
    name: "อะคริลิคแผ่นใส 5mm",
    materialType: "SHEET" as const,
    unitId: "unit-1",
  };
}

function makeUpdatePayload() {
  return { name: "อะคริลิคแผ่นใส 5mm (แก้ไข)", updatedAt: "2026-09-04T00:00:00.000Z" };
}

// ---------------------------------------------------------------------------
// performCreateMaterial
// ---------------------------------------------------------------------------

test("performCreateMaterial POSTs to /materials with type forced to PC and forwards the caller's body", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    // The Material functions are typed as `apiFetch<Material>` (not
    // `<LoginResponse>`-style wrapped result), so the mock returns the
    // Material object directly. If the real API actually wraps the
    // response, the production type is wrong — but that's a pre-existing
    // issue independent of this test (the table component would also
    // break). The image upload test (`material-pc-image-upload.test.ts`)
    // uses the same direct-return pattern for its mock.
    return jsonResponse(201, makeMaterialFixture());
  });

  const { performCreateMaterial } = await import("./actions");
  const result = await performCreateMaterial("test-token", makeCreatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/materials");
  assert.equal(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  const body = JSON.parse(requestInit?.body as string);
  // The action ALWAYS sets type to "PC" — caller can't override it.
  // This is the single source of truth for /materials/pc's type field
  // and is the reason this page exists (see Conventions § Materials PC).
  assert.equal(body.type, "PC");
  assert.equal(body.code, "MAT-PC-001");
  assert.equal(body.name, "อะคริลิคแผ่นใส 5mm");
  assert.equal(body.unitId, "unit-1");
});

// --- supplierIds forwarding (added in response to a bug report that
// adding/editing material doesn't save suppliers). The existing tests above
// never included supplierIds in the fixture, so a silent drop would have
// passed.
test('performCreateMaterial forwards supplierIds in the request body', async (t) => {
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
    requestInit = init;
    return jsonResponse(201, makeMaterialFixture());
  });
  const { performCreateMaterial } = await import('./actions');
  await performCreateMaterial('test-token', {
    ...makeCreatePayload(),
    supplierIds: ['supplier-1', 'supplier-2'],
  });
  assert.ok(requestInit?.body);
  const body = JSON.parse(String(requestInit.body));
  assert.deepEqual(body.supplierIds, ['supplier-1', 'supplier-2']);
});
test('performCreateMaterial forwards an empty supplierIds array', async (t) => {
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
    requestInit = init;
    return jsonResponse(201, makeMaterialFixture());
  });
  const { performCreateMaterial } = await import('./actions');
  await performCreateMaterial('test-token', {
    ...makeCreatePayload(),
    supplierIds: [],
  });
  assert.ok(requestInit?.body);
  const body = JSON.parse(String(requestInit.body));
  assert.deepEqual(body.supplierIds, []);
});
test('performUpdateMaterial forwards supplierIds in the PATCH body', async (t) => {
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
    requestInit = init;
    return jsonResponse(200, makeMaterialFixture());
  });
  const { performUpdateMaterial } = await import('./actions');
  await performUpdateMaterial('test-token', 'material-1', {
    ...makeUpdatePayload(),
    supplierIds: ['supplier-3', 'supplier-4', 'supplier-5'],
  });
  assert.ok(requestInit?.body);
  const body = JSON.parse(String(requestInit.body));
  assert.deepEqual(body.supplierIds, ['supplier-3', 'supplier-4', 'supplier-5']);
  assert.equal(body.updatedAt, '2026-09-04T00:00:00.000Z');
});


test("performCreateMaterial returns 'conflict' on 409 (optimistic-concurrency)", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    jsonResponse(409, { message: "Material was updated by another user" })
  );

  const { performCreateMaterial } = await import("./actions");
  const result = await performCreateMaterial("test-token", makeCreatePayload());

  assert.equal(result.status, "conflict");
  // The 409 message is the user-friendly Thai fallback, not the raw
  // backend message — `errorResult` rewrites 409 to the same "refresh and
  // retry" prompt every other create flow uses, so this assertion guards
  // against accidentally showing the raw backend string.
  assert.match((result as { message: string }).message, /อัปเดตจากที่อื่น/);
});

test("performCreateMaterial returns the API error message on non-2xx (non-409)", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    jsonResponse(500, { message: ["Internal error", "DB down"] })
  );

  const { performCreateMaterial } = await import("./actions");
  const result = await performCreateMaterial("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  // Multi-part message gets joined with ", " so the user sees both.
  assert.match((result as { message: string }).message, /Internal error, DB down/);
});

test("performCreateMaterial returns a single string message (not joined) when the API sends a plain string", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    jsonResponse(422, { message: "Code already exists" })
  );

  const { performCreateMaterial } = await import("./actions");
  const result = await performCreateMaterial("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "Code already exists");
});

test("performCreateMaterial returns the generic Thai connection-failed message on network error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("ECONNREFUSED");
  });

  const { performCreateMaterial } = await import("./actions");
  const result = await performCreateMaterial("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  // Network/non-ApiError path: the original Error name/message gets
  // swallowed and the friendly fallback is returned so the user always
  // sees a localized message in the toast.
  assert.equal((result as { message: string }).message, "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
});

test("performCreateMaterial falls back to the generic Thai error when the API returns no message body", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(500, {}));

  const { performCreateMaterial } = await import("./actions");
  const result = await performCreateMaterial("test-token", makeCreatePayload());

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
});

// ---------------------------------------------------------------------------
// performUpdateMaterial
// ---------------------------------------------------------------------------

test("performUpdateMaterial PATCHes the right URL with the payload (incl. updatedAt for optimistic-concurrency)", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialFixture({ name: "updated" }));
  });

  const { performUpdateMaterial } = await import("./actions");
  const result = await performUpdateMaterial("test-token", "material-1", makeUpdatePayload());

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/materials/material-1");
  assert.equal(requestInit?.method, "PATCH");
  const body = JSON.parse(requestInit?.body as string);
  assert.equal(body.name, "อะคริลิคแผ่นใส 5mm (แก้ไข)");
  // The form's updatedAt is the optimistic-concurrency token; the action
  // forwards it unchanged. A stale value (or a 409 from the server) is
  // what errorResult() maps to the "conflict" status.
  assert.equal(body.updatedAt, "2026-09-04T00:00:00.000Z");
});

test("performUpdateMaterial returns 'conflict' on 409 (stale updatedAt)", async (t) => {
  t.mock.method(globalThis, "fetch", async () => jsonResponse(409, { message: "stale" }));

  const { performUpdateMaterial } = await import("./actions");
  const result = await performUpdateMaterial("test-token", "material-1", makeUpdatePayload());

  assert.equal(result.status, "conflict");
});

// ---------------------------------------------------------------------------
// performDeactivateMaterial / performRestoreMaterial (soft delete)
// ---------------------------------------------------------------------------

test("performDeactivateMaterial DELETEs /materials/{id} and returns the deactivated material", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialFixture({ isActive: false }));
  });

  const { performDeactivateMaterial } = await import("./actions");
  const result = await performDeactivateMaterial("test-token", "material-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/materials/material-1");
  assert.equal(requestInit?.method, "DELETE");
  assert.equal((result as { material: { isActive: boolean } }).material.isActive, false);
});

test("performRestoreMaterial PATCHes /materials/{id}/restore and returns the reactivated material", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, makeMaterialFixture({ isActive: true }));
  });

  const { performRestoreMaterial } = await import("./actions");
  const result = await performRestoreMaterial("test-token", "material-1");

  assert.equal(result.status, "success");
  assert.equal(requestUrl, "http://api.example.test/api/v1/materials/material-1/restore");
  assert.equal(requestInit?.method, "PATCH");
  assert.equal((result as { material: { isActive: boolean } }).material.isActive, true);
});

// ---------------------------------------------------------------------------
// performUploadMaterialImage
// ---------------------------------------------------------------------------

test("performUploadMaterialImage rejects when file is missing from the FormData", async (t) => {
  let fetchCalled = false;
  t.mock.method(globalThis, "fetch", async () => {
    fetchCalled = true;
    return jsonResponse(200, {});
  });

  const { performUploadMaterialImage } = await import("./actions");
  const formData = new FormData();
  // intentionally no "file" appended
  const result = await performUploadMaterialImage("test-token", formData);

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "กรุณาเลือกรูปภาพวัสดุ");
  assert.equal(fetchCalled, false, "fetch must not be called when file is missing");
});

test("performUploadMaterialImage rejects when the file is an empty blob", async (t) => {
  let fetchCalled = false;
  t.mock.method(globalThis, "fetch", async () => {
    fetchCalled = true;
    return jsonResponse(200, {});
  });

  const { performUploadMaterialImage } = await import("./actions");
  const formData = new FormData();
  formData.set("file", new Blob([], { type: "image/png" }), "empty.png");
  const result = await performUploadMaterialImage("test-token", formData);

  assert.equal(result.status, "error");
  assert.equal(fetchCalled, false);
});

test("performUploadMaterialImage posts the file as multipart and returns the staged path on 200", async (t) => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse(200, {
      imagePath: "/uploads/materials/.tmp/abc.png",
      previewUrl: "/uploads/materials/.tmp/abc.png",
    });
  });

  const { performUploadMaterialImage } = await import("./actions");
  const formData = new FormData();
  formData.set("file", new Blob(["image-bytes"], { type: "image/png" }), "material.png");
  const result = await performUploadMaterialImage("test-token", formData);

  assert.equal(result.status, "success");
  assert.deepEqual(result, {
    status: "success",
    image: {
      imagePath: "/uploads/materials/.tmp/abc.png",
      previewUrl: "/uploads/materials/.tmp/abc.png",
    },
  });
  assert.equal(requestUrl, "http://api.example.test/api/v1/materials/images");
  assert.equal(requestInit?.method, "POST");
  // `apiFetch` must NOT set Content-Type on FormData so the runtime can
  // generate the multipart boundary — same invariant as
  // material-pc-image-upload.test.ts's check.
  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.has("content-type"), false);
  assert.ok(requestInit?.body instanceof FormData);
  assert.ok((requestInit.body as FormData).get("file") instanceof Blob);
});

test("performUploadMaterialImage returns the API error message when the upload is rejected", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    jsonResponse(415, { message: "Unsupported image format" })
  );

  const { performUploadMaterialImage } = await import("./actions");
  const formData = new FormData();
  formData.set("file", new Blob(["image-bytes"], { type: "image/gif" }), "weird.gif");
  const result = await performUploadMaterialImage("test-token", formData);

  assert.equal(result.status, "error");
  assert.equal((result as { message: string }).message, "Unsupported image format");
});
