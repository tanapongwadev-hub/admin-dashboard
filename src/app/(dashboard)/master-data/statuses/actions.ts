"use server";

import {
  createStatusItem,
  updateStatusItem,
  deactivateStatusItem,
  restoreStatusItem,
  type StatusItem,
  type StatusItemPayload,
  type UpdateStatusItemPayload,
} from "@/lib/api/status-items";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

export type StatusItemActionResult = CrudActionResult<"statusItem", StatusItem>;

const actions = createCrudActions({
  api: { create: createStatusItem, update: updateStatusItem, deactivate: deactivateStatusItem, restore: restoreStatusItem },
  resultKey: "statusItem",
  revalidatePath: "/master-data/statuses",
  conflictMessage: "ข้อมูลสถานะนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateStatusItem(accessToken: string, payload: StatusItemPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateStatusItem(accessToken: string, id: string, payload: UpdateStatusItemPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateStatusItem(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreStatusItem(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createStatusItemAction(payload: StatusItemPayload) {
  return actions.create(payload);
}
export async function updateStatusItemAction(id: string, payload: UpdateStatusItemPayload) {
  return actions.update(id, payload);
}
export async function deactivateStatusItemAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreStatusItemAction(id: string) {
  return actions.restore(id);
}
