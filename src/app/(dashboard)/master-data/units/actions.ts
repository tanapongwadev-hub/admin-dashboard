"use server";

import {
  createUnit,
  updateUnit,
  deactivateUnit,
  restoreUnit,
  type Unit,
  type UnitPayload,
  type UpdateUnitPayload,
} from "@/lib/api/units";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/units` admin page. All the real
// logic (cookie read, 409 mapping, session-expiry sign-out, best-effort
// revalidatePath) lives in the shared `createCrudActions` factory (see
// lib/create-crud-actions.ts) — this file only binds it to this
// resource's own API functions/copy, then re-declares each function as a
// literal export (required for Next's "use server" transform to
// recognize it as a Server Action; a bare `export const x = someImport`
// re-export is not guaranteed to be picked up the same way).

export type UnitActionResult = CrudActionResult<"unit", Unit>;

const actions = createCrudActions({
  api: { create: createUnit, update: updateUnit, deactivate: deactivateUnit, restore: restoreUnit },
  resultKey: "unit",
  revalidatePath: "/master-data/units",
  conflictMessage: "ข้อมูลหน่วยนับนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateUnit(accessToken: string, payload: UnitPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateUnit(accessToken: string, id: string, payload: UpdateUnitPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateUnit(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreUnit(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createUnitAction(payload: UnitPayload) {
  return actions.create(payload);
}
export async function updateUnitAction(id: string, payload: UpdateUnitPayload) {
  return actions.update(id, payload);
}
export async function deactivateUnitAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreUnitAction(id: string) {
  return actions.restore(id);
}
