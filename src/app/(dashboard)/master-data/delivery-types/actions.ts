"use server";

import {
  createDeliveryType,
  updateDeliveryType,
  deactivateDeliveryType,
  restoreDeliveryType,
  type DeliveryType,
  type DeliveryTypePayload,
  type UpdateDeliveryTypePayload,
} from "@/lib/api/delivery-types";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/delivery-types` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action; a bare `export const x = someImport`
// re-export is not guaranteed to be picked up the same way).

export type DeliveryTypeActionResult = CrudActionResult<"deliveryType", DeliveryType>;

const actions = createCrudActions({
  api: { create: createDeliveryType, update: updateDeliveryType, deactivate: deactivateDeliveryType, restore: restoreDeliveryType },
  resultKey: "deliveryType",
  revalidatePath: "/master-data/delivery-types",
  conflictMessage: "ข้อมูลประเภทการจัดส่งนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateDeliveryType(accessToken: string, payload: DeliveryTypePayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateDeliveryType(accessToken: string, id: string, payload: UpdateDeliveryTypePayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateDeliveryType(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreDeliveryType(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createDeliveryTypeAction(payload: DeliveryTypePayload) {
  return actions.create(payload);
}
export async function updateDeliveryTypeAction(id: string, payload: UpdateDeliveryTypePayload) {
  return actions.update(id, payload);
}
export async function deactivateDeliveryTypeAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreDeliveryTypeAction(id: string) {
  return actions.restore(id);
}
