"use server";

import {
  createCategory,
  updateCategory,
  deactivateCategory,
  restoreCategory,
  type Category,
  type CategoryPayload,
  type UpdateCategoryPayload,
} from "@/lib/api/categories";
import { createCrudActions, type CrudActionResult } from "@/lib/create-crud-actions";

// Server Actions for the `/master-data/categories` admin page. All the
// real logic (cookie read, 409 mapping, session-expiry sign-out,
// best-effort revalidatePath) lives in the shared `createCrudActions`
// factory (see lib/create-crud-actions.ts) — this file only binds it to
// this resource's own API functions/copy, then re-declares each function
// as a literal export (required for Next's "use server" transform to
// recognize it as a Server Action; a bare `export const x = someImport`
// re-export is not guaranteed to be picked up the same way).

export type CategoryActionResult = CrudActionResult<"category", Category>;

const actions = createCrudActions({
  api: { create: createCategory, update: updateCategory, deactivate: deactivateCategory, restore: restoreCategory },
  resultKey: "category",
  revalidatePath: "/master-data/categories",
  conflictMessage: "ข้อมูลหมวดหมู่นี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
});

export async function performCreateCategory(accessToken: string, payload: CategoryPayload) {
  return actions.performCreate(accessToken, payload);
}
export async function performUpdateCategory(accessToken: string, id: string, payload: UpdateCategoryPayload) {
  return actions.performUpdate(accessToken, id, payload);
}
export async function performDeactivateCategory(accessToken: string, id: string) {
  return actions.performDeactivate(accessToken, id);
}
export async function performRestoreCategory(accessToken: string, id: string) {
  return actions.performRestore(accessToken, id);
}

export async function createCategoryAction(payload: CategoryPayload) {
  return actions.create(payload);
}
export async function updateCategoryAction(id: string, payload: UpdateCategoryPayload) {
  return actions.update(id, payload);
}
export async function deactivateCategoryAction(id: string) {
  return actions.deactivate(id);
}
export async function restoreCategoryAction(id: string) {
  return actions.restore(id);
}
