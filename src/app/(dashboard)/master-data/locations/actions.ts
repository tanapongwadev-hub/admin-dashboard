"use server";

import {
  createLocation,
  updateLocation,
  deactivateLocation,
  restoreLocation,
  type Location,
  type LocationPayload,
  type UpdateLocationPayload,
} from "@/lib/api/locations";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/locations` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action).

export type LocationActionResult = CrudActionResult<"location", Location>;

const actions = createCrudActions({
  api: { create: createLocation, update: updateLocation, deactivate: deactivateLocation, restore: restoreLocation },
  resultKey: "location",
  revalidatePath: "/master-data/locations",
  conflictMessage: "ข้อมูลสถานที่นี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateLocation(accessToken: string, payload: LocationPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateLocation(accessToken: string, id: string, payload: UpdateLocationPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateLocation(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreLocation(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createLocationAction(payload: LocationPayload) {
  return actions.create(payload);
}
export async function updateLocationAction(id: string, payload: UpdateLocationPayload) {
  return actions.update(id, payload);
}
export async function deactivateLocationAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreLocationAction(id: string) {
  return actions.restore(id);
}