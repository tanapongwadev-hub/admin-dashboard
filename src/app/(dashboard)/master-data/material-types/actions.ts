"use server";

import {
  createMaterialType,
  updateMaterialType,
  deactivateMaterialType,
  restoreMaterialType,
  type MaterialType,
  type MaterialTypePayload,
  type UpdateMaterialTypePayload,
} from "@/lib/api/material-types";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/material-types` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action).

export type MaterialTypeActionResult = CrudActionResult<"materialType", MaterialType>;

const actions = createCrudActions({
  api: { create: createMaterialType, update: updateMaterialType, deactivate: deactivateMaterialType, restore: restoreMaterialType },
  resultKey: "materialType",
  revalidatePath: "/master-data/material-types",
  conflictMessage: "ข้อมูลประเภทวัสดุนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateMaterialType(accessToken: string, payload: MaterialTypePayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateMaterialType(accessToken: string, id: string, payload: UpdateMaterialTypePayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateMaterialType(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreMaterialType(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createMaterialTypeAction(payload: MaterialTypePayload) {
  return actions.create(payload);
}
export async function updateMaterialTypeAction(id: string, payload: UpdateMaterialTypePayload) {
  return actions.update(id, payload);
}
export async function deactivateMaterialTypeAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreMaterialTypeAction(id: string) {
  return actions.restore(id);
}
