"use server";

import {
  createProcessStep,
  updateProcessStep,
  deactivateProcessStep,
  restoreProcessStep,
  type ProcessStep,
  type ProcessStepPayload,
  type UpdateProcessStepPayload,
} from "@/lib/api/process-steps";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for `/master-data/process-steps` — thin binding over the
// shared `createCrudActions` factory (see lib/create-crud-actions.ts).

export type ProcessStepActionResult = CrudActionResult<"processStep", ProcessStep>;

const actions = createCrudActions({
  api: { create: createProcessStep, update: updateProcessStep, deactivate: deactivateProcessStep, restore: restoreProcessStep },
  resultKey: "processStep",
  revalidatePath: "/master-data/process-steps",
  conflictMessage: "ข้อมูลกระบวนการผลิตนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateProcessStep(accessToken: string, payload: ProcessStepPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateProcessStep(accessToken: string, id: string, payload: UpdateProcessStepPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateProcessStep(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreProcessStep(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createProcessStepAction(payload: ProcessStepPayload) {
  return actions.create(payload);
}
export async function updateProcessStepAction(id: string, payload: UpdateProcessStepPayload) {
  return actions.update(id, payload);
}
export async function deactivateProcessStepAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreProcessStepAction(id: string) {
  return actions.restore(id);
}
