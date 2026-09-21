"use server";

import {
  createProductType,
  updateProductType,
  deactivateProductType,
  restoreProductType,
  type ProductType,
  type ProductTypePayload,
  type UpdateProductTypePayload,
} from "@/lib/api/product-types";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/product-types` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action).

export type ProductTypeActionResult = CrudActionResult<"productType", ProductType>;

const actions = createCrudActions({
  api: { create: createProductType, update: updateProductType, deactivate: deactivateProductType, restore: restoreProductType },
  resultKey: "productType",
  revalidatePath: "/master-data/product-types",
  conflictMessage: "ข้อมูลประเภทสินค้านี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateProductType(accessToken: string, payload: ProductTypePayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateProductType(accessToken: string, id: string, payload: UpdateProductTypePayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateProductType(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreProductType(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createProductTypeAction(payload: ProductTypePayload) {
  return actions.create(payload);
}
export async function updateProductTypeAction(id: string, payload: UpdateProductTypePayload) {
  return actions.update(id, payload);
}
export async function deactivateProductTypeAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreProductTypeAction(id: string) {
  return actions.restore(id);
}