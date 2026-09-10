"use server";

import {
  createMaterialModel,
  updateMaterialModel,
  deactivateMaterialModel,
  restoreMaterialModel,
  type MaterialModel,
  type MaterialModelPayload,
  type UpdateMaterialModelPayload,
} from "@/lib/api/material-models";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/material-models` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action; a bare `export const x = someImport`
// re-export is not guaranteed to be picked up the same way).

export type MaterialModelActionResult = CrudActionResult<"materialModel", MaterialModel>;

const actions = createCrudActions({
  api: { create: createMaterialModel, update: updateMaterialModel, deactivate: deactivateMaterialModel, restore: restoreMaterialModel },
  resultKey: "materialModel",
  revalidatePath: "/master-data/material-models",
  conflictMessage: "ข้อมูลรุ่นวัสดุนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateMaterialModel(accessToken: string, payload: MaterialModelPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateMaterialModel(accessToken: string, id: string, payload: UpdateMaterialModelPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateMaterialModel(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreMaterialModel(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createMaterialModelAction(payload: MaterialModelPayload) {
  return actions.create(payload);
}
export async function updateMaterialModelAction(id: string, payload: UpdateMaterialModelPayload) {
  return actions.update(id, payload);
}
export async function deactivateMaterialModelAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreMaterialModelAction(id: string) {
  return actions.restore(id);
}
