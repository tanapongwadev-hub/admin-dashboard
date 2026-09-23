import assert from "node:assert/strict";
import test from "node:test";
import { groupPickLinesByMaterial } from "@/lib/group-pick-lines";
import type { MaterialJobOrderPickLine } from "@/lib/api/material-job-orders";

function line(
  overrides: Partial<MaterialJobOrderPickLine>,
): MaterialJobOrderPickLine {
  return {
    reservationId: "r-1",
    qrCode: "QR-1",
    materialCode: "MAT-A",
    materialName: "Steel",
    internalLotNo: "LOT-1",
    supplierLotNo: "S-1",
    packageNo: 1,
    loadingPointId: null,
    currentQuantity: "10.0000",
    reservedQuantity: "10.0000",
    issuedQuantity: "0.0000",
    outstandingQuantity: "10.0000",
    pickedAt: null,
    pickedBy: null,
    releasedAt: null,
    status: "in_stock",
    ...overrides,
  };
}

test("groups pick lines by materialCode, preserving first-seen order", () => {
  const lines = [
    line({ reservationId: "r-1", materialCode: "MAT-A", reservedQuantity: "10.0000" }),
    line({ reservationId: "r-2", materialCode: "MAT-B", reservedQuantity: "5.0000" }),
    line({ reservationId: "r-3", materialCode: "MAT-A", reservedQuantity: "2.0000" }),
  ];
  const groups = groupPickLinesByMaterial(lines);
  assert.deepEqual(groups.map((g) => g.materialCode), ["MAT-A", "MAT-B"]);
  assert.equal(groups[0].lines.length, 2);
  assert.equal(groups[0].reserved, 12);
  assert.equal(groups[1].lines.length, 1);
});

test("sums reserved/issued/outstanding per group", () => {
  const lines = [
    line({
      reservationId: "r-1",
      materialCode: "MAT-A",
      reservedQuantity: "10.0000",
      issuedQuantity: "4.0000",
      outstandingQuantity: "6.0000",
    }),
    line({
      reservationId: "r-2",
      materialCode: "MAT-A",
      reservedQuantity: "3.0000",
      issuedQuantity: "0.0000",
      outstandingQuantity: "3.0000",
    }),
  ];
  const [group] = groupPickLinesByMaterial(lines);
  assert.equal(group.reserved, 13);
  assert.equal(group.issued, 4);
  assert.equal(group.outstanding, 9);
});

test("returns an empty array for no lines", () => {
  assert.deepEqual(groupPickLinesByMaterial([]), []);
});
