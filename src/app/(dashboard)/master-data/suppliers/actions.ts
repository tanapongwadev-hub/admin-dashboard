"use server";

import {
  createSupplier,
  updateSupplier,
  deactivateSupplier,
  restoreSupplier,
  type Supplier,
  type SupplierPayload,
  type UpdateSupplierPayload,
} from "@/lib/api/suppliers";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/suppliers` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action; a bare `export const x = someImport`
// re-export is not guaranteed to be picked up the same way).

export type SupplierActionResult = CrudActionResult<"supplier", Supplier>;

const actions = createCrudActions({
  api: { create: createSupplier, update: updateSupplier, deactivate: deactivateSupplier, restore: restoreSupplier },
  resultKey: "supplier",
  revalidatePath: "/master-data/suppliers",
  conflictMessage: "ข้อมูลผู้จัดจำหน่ายนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateSupplier(accessToken: string, payload: SupplierPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateSupplier(accessToken: string, id: string, payload: UpdateSupplierPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateSupplier(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreSupplier(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createSupplierAction(payload: SupplierPayload) {
  return actions.create(payload);
}
export async function updateSupplierAction(id: string, payload: UpdateSupplierPayload) {
  return actions.update(id, payload);
}
export async function deactivateSupplierAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreSupplierAction(id: string) {
  return actions.restore(id);
}
