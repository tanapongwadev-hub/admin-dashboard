import assert from "node:assert/strict";
import test from "node:test";
import { calculateReceivingPreview } from "./materials-receiving-calculation";

test("PIPE converts received quantity before packaging", () => {
  const result = calculateReceivingPreview({
    receivedQuantity: 2,
    materialShape: "PIPE",
    ratio: 20,
    packQuantity: 20,
  });

  assert.equal(result.convertedQuantity, 40);
  assert.deepEqual(result.packages.map((item) => item.quantity), [20, 20]);
});

test("ratio-based shapes preserve a partial final package", () => {
  const result = calculateReceivingPreview({
    receivedQuantity: 3,
    materialShape: "SHEET",
    ratio: 20,
    packQuantity: 25,
  });

  assert.equal(result.convertedQuantity, 60);
  assert.deepEqual(result.packages.map((item) => item.quantity), [25, 25, 10]);
  assert.equal(
    result.packages.reduce((sum, item) => sum + item.quantity, 0),
    result.convertedQuantity
  );
});

test("COIL uses the same conversion rule", () => {
  const result = calculateReceivingPreview({
    receivedQuantity: 2,
    materialShape: "COIL",
    ratio: 20,
    packQuantity: 20,
  });

  assert.equal(result.convertedQuantity, 40);
  assert.equal(result.packageCount, 2);
});

test("an edited receiving ratio immediately changes converted quantity and packages", () => {
  const result = calculateReceivingPreview({
    receivedQuantity: 2,
    materialShape: "PIPE",
    ratio: 25,
    packQuantity: 20,
  });

  assert.equal(result.convertedQuantity, 50);
  assert.deepEqual(result.packages.map((item) => item.quantity), [20, 20, 10]);
});

test("other shapes preserve the existing 1:1 calculation", () => {
  const result = calculateReceivingPreview({
    receivedQuantity: 30,
    materialShape: "PCS",
    ratio: null,
    packQuantity: 20,
  });

  assert.equal(result.convertedQuantity, 30);
  assert.deepEqual(result.packages.map((item) => item.quantity), [20, 10]);
});
