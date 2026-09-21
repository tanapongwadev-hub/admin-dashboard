"use server";

import {
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  restoreCustomer,
  type Customer,
  type CustomerPayload,
  type UpdateCustomerPayload,
} from "@/lib/api/customers";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/customers` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action).

export type CustomerActionResult = CrudActionResult<"customer", Customer>;

const actions = createCrudActions({
  api: { create: createCustomer, update: updateCustomer, deactivate: deactivateCustomer, restore: restoreCustomer },
  resultKey: "customer",
  revalidatePath: "/master-data/customers",
  conflictMessage: "ข้อมูลลูกค้านี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateCustomer(accessToken: string, payload: CustomerPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateCustomer(accessToken: string, id: string, payload: UpdateCustomerPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateCustomer(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreCustomer(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createCustomerAction(payload: CustomerPayload) {
  return actions.create(payload);
}
export async function updateCustomerAction(id: string, payload: UpdateCustomerPayload) {
  return actions.update(id, payload);
}
export async function deactivateCustomerAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreCustomerAction(id: string) {
  return actions.restore(id);
}