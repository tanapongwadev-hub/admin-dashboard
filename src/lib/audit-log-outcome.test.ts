import assert from "node:assert/strict";
import test from "node:test";
import { getAuditOutcomePresentation } from "./audit-log-outcome";

test("unknown Audit outcome is rendered as a safe neutral fallback", () => {
  assert.deepEqual(getAuditOutcomePresentation("QUEUED"), {
    label: "ไม่ทราบผลลัพธ์",
    variant: "neutral",
  });
});

test("missing Audit outcome is rendered as a safe neutral fallback", () => {
  assert.deepEqual(getAuditOutcomePresentation(undefined), {
    label: "ไม่ทราบผลลัพธ์",
    variant: "neutral",
  });
});
