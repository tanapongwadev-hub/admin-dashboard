"use server";

import {
  createProcessLine,
  updateProcessLine,
  deactivateProcessLine,
  restoreProcessLine,
  type ProcessLine,
  type ProcessLinePayload,
  type UpdateProcessLinePayload,
} from "@/lib/api/process-lines";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/process-lines` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action).

export type ProcessLineActionResult = CrudActionResult<"processLine", ProcessLine>;

const actions = createCrudActions({
  api: { create: createProcessLine, update: updateProcessLine, deactivate: deactivateProcessLine, restore: restoreProcessLine },
  resultKey: "processLine",
  revalidatePath: "/master-data/process-lines",
  conflictMessage: "ข้อมูลสายการผลิตนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateProcessLine(accessToken: string, payload: ProcessLinePayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateProcessLine(accessToken: string, id: string, payload: UpdateProcessLinePayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateProcessLine(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreProcessLine(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createProcessLineAction(payload: ProcessLinePayload) {
  return actions.create(payload);
}
export async function updateProcessLineAction(id: string, payload: UpdateProcessLinePayload) {
  return actions.update(id, payload);
}
export async function deactivateProcessLineAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreProcessLineAction(id: string) {
  return actions.restore(id);
}