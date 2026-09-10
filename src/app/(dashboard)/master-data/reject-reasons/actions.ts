"use server";

import {
  createRejectReason,
  updateRejectReason,
  deactivateRejectReason,
  restoreRejectReason,
  type RejectReason,
  type RejectReasonPayload,
  type UpdateRejectReasonPayload,
} from "@/lib/api/reject-reasons";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/reject-reasons` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action; a bare `export const x = someImport`
// re-export is not guaranteed to be picked up the same way).

export type RejectReasonActionResult = CrudActionResult<"rejectReason", RejectReason>;

const actions = createCrudActions({
  api: { create: createRejectReason, update: updateRejectReason, deactivate: deactivateRejectReason, restore: restoreRejectReason },
  resultKey: "rejectReason",
  revalidatePath: "/master-data/reject-reasons",
  conflictMessage: "ข้อมูลเหตุผลการปฏิเสธนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateRejectReason(accessToken: string, payload: RejectReasonPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateRejectReason(accessToken: string, id: string, payload: UpdateRejectReasonPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateRejectReason(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreRejectReason(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createRejectReasonAction(payload: RejectReasonPayload) {
  return actions.create(payload);
}
export async function updateRejectReasonAction(id: string, payload: UpdateRejectReasonPayload) {
  return actions.update(id, payload);
}
export async function deactivateRejectReasonAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreRejectReasonAction(id: string) {
  return actions.restore(id);
}
