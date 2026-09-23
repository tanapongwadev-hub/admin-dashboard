import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "./api/api-error";
import {
  apiErrorMessage,
  translateUserErrorMessage,
} from "./user-error";

test("preserves Thai API messages and translates known English messages", () => {
  assert.equal(translateUserErrorMessage("กรุณาระบุเหตุผล"), "กรุณาระบุเหตุผล");
  assert.equal(
    translateUserErrorMessage("Material receiving not found"),
    "ไม่พบรายการรับเข้า",
  );
  assert.equal(
    translateUserErrorMessage("Supplier code already exists"),
    "รหัสผู้จำหน่ายนี้มีอยู่ในระบบแล้ว",
  );
});

test("translates every item in a validation message array", () => {
  assert.equal(
    translateUserErrorMessage(["Product code is required", "ข้อมูลวันที่ไม่ถูกต้อง"]),
    "กรุณาระบุ Product code · ข้อมูลวันที่ไม่ถูกต้อง",
  );
});

test("does not expose unknown English errors", () => {
  assert.equal(
    apiErrorMessage(new ApiError("request failed", 500, { message: "driver exploded" })),
    "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง",
  );
});

test("deduplicates a repeated safe fallback from an English message array", () => {
  assert.equal(
    translateUserErrorMessage(["DB error", "Timeout"], "ระบบขัดข้องชั่วคราว"),
    "ระบบขัดข้องชั่วคราว",
  );
});
