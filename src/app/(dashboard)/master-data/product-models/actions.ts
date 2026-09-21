"use server";

import {
  createProductModel,
  updateProductModel,
  deactivateProductModel,
  restoreProductModel,
  type ProductModel,
  type ProductModelPayload,
  type UpdateProductModelPayload,
} from "@/lib/api/product-models";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/product-models` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action).

export type ProductModelActionResult = CrudActionResult<"productModel", ProductModel>;

const actions = createCrudActions({
  api: { create: createProductModel, update: updateProductModel, deactivate: deactivateProductModel, restore: restoreProductModel },
  resultKey: "productModel",
  revalidatePath: "/master-data/product-models",
  conflictMessage: "ข้อมูลรุ่นสินค้านี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateProductModel(accessToken: string, payload: ProductModelPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateProductModel(accessToken: string, id: string, payload: UpdateProductModelPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateProductModel(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreProductModel(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createProductModelAction(payload: ProductModelPayload) {
  return actions.create(payload);
}
export async function updateProductModelAction(id: string, payload: UpdateProductModelPayload) {
  return actions.update(id, payload);
}
export async function deactivateProductModelAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreProductModelAction(id: string) {
  return actions.restore(id);
}