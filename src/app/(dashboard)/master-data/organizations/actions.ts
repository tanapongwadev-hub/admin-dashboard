"use server";

import {
  createOrganization,
  updateOrganization,
  deactivateOrganization,
  restoreOrganization,
  type Organization,
  type OrganizationPayload,
  type UpdateOrganizationPayload,
} from "@/lib/api/organizations";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for `/master-data/organizations` — thin binding over the
// shared `createCrudActions` factory (see lib/create-crud-actions.ts).

export type OrganizationActionResult = CrudActionResult<"organization", Organization>;

const actions = createCrudActions({
  api: { create: createOrganization, update: updateOrganization, deactivate: deactivateOrganization, restore: restoreOrganization },
  resultKey: "organization",
  revalidatePath: "/master-data/organizations",
  conflictMessage: "ข้อมูลองค์กรนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateOrganization(accessToken: string, payload: OrganizationPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateOrganization(accessToken: string, id: string, payload: UpdateOrganizationPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateOrganization(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreOrganization(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createOrganizationAction(payload: OrganizationPayload) {
  return actions.create(payload);
}
export async function updateOrganizationAction(id: string, payload: UpdateOrganizationPayload) {
  return actions.update(id, payload);
}
export async function deactivateOrganizationAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreOrganizationAction(id: string) {
  return actions.restore(id);
}
