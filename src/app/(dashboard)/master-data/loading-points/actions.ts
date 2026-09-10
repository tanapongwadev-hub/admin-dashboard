"use server";

import {
  createLoadingPoint,
  updateLoadingPoint,
  deactivateLoadingPoint,
  restoreLoadingPoint,
  type LoadingPoint,
  type LoadingPointPayload,
  type UpdateLoadingPointPayload,
} from "@/lib/api/loading-points";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/loading-points` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action; a bare `export const x = someImport`
// re-export is not guaranteed to be picked up the same way).

export type LoadingPointActionResult = CrudActionResult<"loadingPoint", LoadingPoint>;

const actions = createCrudActions({
  api: { create: createLoadingPoint, update: updateLoadingPoint, deactivate: deactivateLoadingPoint, restore: restoreLoadingPoint },
  resultKey: "loadingPoint",
  revalidatePath: "/master-data/loading-points",
  conflictMessage: "ข้อมูลจุดขนถ่ายนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateLoadingPoint(accessToken: string, payload: LoadingPointPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateLoadingPoint(accessToken: string, id: string, payload: UpdateLoadingPointPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateLoadingPoint(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreLoadingPoint(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createLoadingPointAction(payload: LoadingPointPayload) {
  return actions.create(payload);
}
export async function updateLoadingPointAction(id: string, payload: UpdateLoadingPointPayload) {
  return actions.update(id, payload);
}
export async function deactivateLoadingPointAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreLoadingPointAction(id: string) {
  return actions.restore(id);
}
