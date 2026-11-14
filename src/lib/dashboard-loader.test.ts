import test from "node:test";
import assert from "node:assert/strict";
import { loadDashboardData } from "./dashboard-loader";

const originalBase = process.env.API_BASE_URL;
test.beforeEach(() => { process.env.API_BASE_URL = "http://api.example.test"; });
test.after(() => { if (originalBase === undefined) delete process.env.API_BASE_URL; else process.env.API_BASE_URL = originalBase; });
const summary = { inventory: { total: 0, normal: 0, lowStock: 0, outOfStock: 0 }, trend: [], receivedLast7: 0, disbursedLast7: 0, productionOrders: {}, productionPlans: {} };
const session = { user: { isSuperAdmin: true }, permissions: [] };

test("failed sources remain distinguishable from empty and zero data", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  const data = await loadDashboardData("test", session);
  assert.equal(data.inventory, null);
  assert.deepEqual(data.failedSources, ["ข้อมูลสรุป", "รายการเฝ้าระวังสต็อก", "เอกสารรับเข้า", "เอกสารเบิกจ่าย"]);
});

test("successful empty results are not reported as failures", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => new Response(JSON.stringify(url.includes("dashboard/summary") ? summary : { items: [] })));
  const data = await loadDashboardData("test", session);
  assert.deepEqual(data.failedSources, []);
  assert.equal(data.inventory?.total, 0);
});

test("missing permissions do not fetch detail lists or report them as failures", async (t) => {
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => { urls.push(url); return new Response(JSON.stringify(summary)); });
  const data = await loadDashboardData("test", { user: { isSuperAdmin: false }, permissions: [] });
  assert.equal(urls.length, 1);
  assert.equal(data.canViewCatalog, false);
  assert.equal(data.canViewStock, false);
  assert.deepEqual(data.failedSources, []);
});

test("disbursement documents show item counts rather than adding unknown units", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => new Response(JSON.stringify(url.includes("dashboard/summary") ? summary : url.includes("materials-disbursement") ? { items: [{ disbursementNo: "DIS-1", status: "confirmed", disbursementType: "production", disbursementDate: "2026-11-03", items: [{ material: { name: "เหล็ก" }, disbursedQuantity: "100" }, { material: { name: "น็อต" }, disbursedQuantity: "20" }] }] } : { items: [] })));
  const data = await loadDashboardData("test", session);
  assert.equal(data.documents[0]?.qty, 2);
  assert.equal(data.documents[0]?.unit, "รายการ");
});
