import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMaterialJobOrdersChips,
  readMaterialJobOrdersFilters,
} from "@/lib/filters/material-job-orders-filters";
import { buildAllOutstandingIssueItems } from "@/lib/material-job-order-issue";
import type { MaterialJobOrderPickLine } from "@/lib/api/material-job-orders";

function pickLine(
  overrides: Partial<MaterialJobOrderPickLine>,
): MaterialJobOrderPickLine {
  return {
    reservationId: "reservation-1",
    qrCode: "QR-1",
    materialCode: "MAT-001",
    materialName: "Material 1",
    internalLotNo: "LOT-1",
    supplierLotNo: "SUP-1",
    packageNo: 1,
    loadingPointId: null,
    currentQuantity: "10.0000",
    reservedQuantity: "10.0000",
    issuedQuantity: "0.0000",
    outstandingQuantity: "10.0000",
    pickedAt: "2026-09-23T10:00:00.000Z",
    pickedBy: "1",
    releasedAt: null,
    status: "in_stock",
    ...overrides,
  };
}

test("job order filters accept only real statuses and produce removable date/status chips", () => {
  const filters = readMaterialJobOrdersFilters(
    new URLSearchParams(
      "status=READY_TO_ISSUE&approvedDateFrom=2026-09-22&approvedDateTo=2026-09-30",
    ),
  );
  assert.equal(filters.status, "READY_TO_ISSUE");
  assert.deepEqual(
    buildMaterialJobOrdersChips(filters).map((chip) => chip.key),
    ["status", "approvedDateFrom"],
  );
  assert.equal(
    readMaterialJobOrdersFilters(new URLSearchParams("status=unknown")).status,
    "all",
  );
});

test("job order filters default to no filters when the URL has none", () => {
  const filters = readMaterialJobOrdersFilters(new URLSearchParams(""));
  assert.equal(filters.status, "all");
  assert.equal(filters.search, "");
  assert.deepEqual(buildMaterialJobOrdersChips(filters), []);
});

test("builds a full-stock issue payload from every eligible picked line", () => {
  const items = buildAllOutstandingIssueItems([
    pickLine({ reservationId: "reservation-1", outstandingQuantity: "10.2500" }),
    pickLine({ reservationId: "reservation-2", outstandingQuantity: "3.5000" }),
  ]);

  assert.deepEqual(items, [
    { reservationId: "reservation-1", quantity: "10.2500" },
    { reservationId: "reservation-2", quantity: "3.5000" },
  ]);
});

test("excludes unpicked, released, and fully issued lines from a full-stock issue", () => {
  const items = buildAllOutstandingIssueItems([
    pickLine({ reservationId: "unpicked", pickedAt: null }),
    pickLine({
      reservationId: "released",
      releasedAt: "2026-09-23T11:00:00.000Z",
    }),
    pickLine({ reservationId: "complete", outstandingQuantity: "0.0000" }),
    pickLine({ reservationId: "eligible", outstandingQuantity: "1.0000" }),
  ]);

  assert.deepEqual(items, [
    { reservationId: "eligible", quantity: "1.0000" },
  ]);
});
