import assert from "node:assert/strict";
import test from "node:test";
import { calculateReceivingPreview } from "./materials-receiving-calculation";

for (const materialShape of ["PIPE", "SHEET", "COIL", "PCS"]) {
  for (const ratio of [null, 20, 25]) {
    test(materialShape + " receives the entered quantity directly with ratio " + ratio, () => {
      const result = calculateReceivingPreview({ receivedQuantity: 60, materialShape, ratio, packQuantity: 25 });
      assert.equal(result.requiresConversion, false);
      assert.equal(result.convertedQuantity, 60);
      assert.deepEqual(result.packages.map((item) => item.quantity), materialShape === "PCS" ? [25, 25, 10] : [60]);
      assert.equal(result.packages[0].isRemainder, false);
      assert.equal(result.packages.reduce((sum, item) => sum + item.quantity, 0), 60);
    });
  }
}
