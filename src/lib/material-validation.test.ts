import assert from "node:assert/strict";
import test from "node:test";
import {
  MATERIAL_MESSAGES,
  validateMaterialCore,
  validateMinimumStock,
  validatePackingQuantity,
} from "./material-validation";

const valid = {
  code: "MAT-1",
  name: "Steel",
  materialTypeId: "3",
  unitId: "1",
  packingQuantity: "25",
  minimumStock: "",
  supplierCount: 1,
  hasImage: true,
};

test("a complete material has no errors", () => {
  assert.deepEqual(validateMaterialCore(valid), {});
});

test("an empty material reports every required field with the shared messages", () => {
  const errors = validateMaterialCore({ ...valid, code: " ", name: "", materialTypeId: "", unitId: "", packingQuantity: "", supplierCount: 0, hasImage: false });
  assert.equal(errors.code, MATERIAL_MESSAGES.codeRequired);
  assert.equal(errors.name, MATERIAL_MESSAGES.nameRequired);
  assert.equal(errors.materialTypeId, MATERIAL_MESSAGES.materialTypeRequired);
  assert.equal(errors.unitId, MATERIAL_MESSAGES.unitRequired);
  assert.equal(errors.packingQuantity, MATERIAL_MESSAGES.packingRequired);
  assert.equal(errors.suppliers, MATERIAL_MESSAGES.supplierRequired);
  assert.equal(errors.image, MATERIAL_MESSAGES.imageRequired);
});

test("packing quantity must be a whole number from 1 to 1,000,000", () => {
  assert.equal(validatePackingQuantity("1"), null);
  assert.equal(validatePackingQuantity(1000000), null);
  for (const bad of ["0", "1.5", "-2", "1000001", "abc"]) assert.equal(validatePackingQuantity(bad), MATERIAL_MESSAGES.packingRange);
});

test("minimum stock is optional but never negative", () => {
  assert.equal(validateMinimumStock(""), null);
  assert.equal(validateMinimumStock("0"), null);
  assert.equal(validateMinimumStock("-1"), MATERIAL_MESSAGES.minimumStockNegative);
});

test("code and name length limits", () => {
  assert.equal(validateMaterialCore({ ...valid, code: "x".repeat(51) }).code, MATERIAL_MESSAGES.codeTooLong);
  assert.equal(validateMaterialCore({ ...valid, name: "x".repeat(256) }).name, MATERIAL_MESSAGES.nameTooLong);
});
