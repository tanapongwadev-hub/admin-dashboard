import assert from "node:assert/strict";
import test from "node:test";
import { getProductionPlanRowActions } from "@/components/production-plans/production-plan-table";
import type {
  ProductionPlan,
  ProductionPlanStatus,
} from "@/lib/api/production-plans";
import {
  buildProductionPlansChips,
  readProductionPlansFilters,
} from "@/lib/filters/production-plans-filters";

function plan(
  status: ProductionPlanStatus,
  jobOrder: ProductionPlan["jobOrder"] = null,
): ProductionPlan {
  return {
    id: "1",
    code: "PP-202609-0001",
    title: "September",
    status,
    remark: null,
    approvedAt: null,
    issuedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
    lines: [],
    jobOrder,
  };
}

const handlers = {
  view: () => undefined,
  edit: () => undefined,
  approve: () => undefined,
  cancel: () => undefined,
  delete: () => undefined,
  viewJobOrder: () => undefined,
  printJobOrder: () => undefined,
};
const all = {
  update: true,
  approve: true,
  cancel: true,
  delete: true,
  viewJobOrder: true,
  printJobOrder: true,
};

test("row actions enforce the confirmed production-plan lifecycle", () => {
  assert.deepEqual(
    getProductionPlanRowActions(plan("DRAFT"), all, handlers).map(
      (item) => item.label,
    ),
    ["ดูรายละเอียด", "แก้ไข", "อนุมัติและกันสต็อก", "ยกเลิกแผน", "ลบร่าง"],
  );
  const approvedWithJobOrder = plan("APPROVED", {
    id: "jo-1",
    code: "JO-20260922-0001",
    status: "WAITING_PICKING",
  });
  assert.deepEqual(
    getProductionPlanRowActions(approvedWithJobOrder, all, handlers).map(
      (item) => item.label,
    ),
    ["ดูรายละเอียด", "ดูใบจัดงาน", "พิมพ์ใบจัดงาน", "ยกเลิกแผน"],
  );
  assert.deepEqual(
    getProductionPlanRowActions(plan("ISSUED"), all, handlers).map(
      (item) => item.label,
    ),
    ["ดูรายละเอียด"],
  );
  assert.deepEqual(
    getProductionPlanRowActions(plan("EXPIRED"), all, handlers).map(
      (item) => item.label,
    ),
    ["ดูรายละเอียด"],
  );
});

test("row actions never reveal protected mutations without permissions", () => {
  const none = {
    update: false,
    approve: false,
    cancel: false,
    delete: false,
    viewJobOrder: false,
    printJobOrder: false,
  };
  assert.deepEqual(
    getProductionPlanRowActions(plan("DRAFT"), none, handlers).map(
      (item) => item.label,
    ),
    ["ดูรายละเอียด"],
  );
});

test("filters accept only real statuses and produce removable date/status chips", () => {
  const filters = readProductionPlansFilters(
    new URLSearchParams(
      "status=APPROVED&needByDateFrom=2026-09-22&needByDateTo=2026-09-30",
    ),
  );
  assert.equal(filters.status, "APPROVED");
  assert.deepEqual(
    buildProductionPlansChips(filters).map((chip) => chip.key),
    ["status", "needByDateFrom"],
  );
  assert.equal(
    readProductionPlansFilters(new URLSearchParams("status=unknown")).status,
    "all",
  );
});
