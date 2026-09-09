"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createCategory,
  updateCategory,
  deactivateCategory,
  restoreCategory,
  type Category,
  type CategoryPayload,
  type UpdateCategoryPayload,
} from "@/lib/api/categories";
import { ApiError } from "@/lib/api/client";

// Server Actions for the `/master-data/categories` admin page. Same
// `perform*` helper + thin cookie-reading public-wrapper pattern as
// `materials/pc/actions.ts` and `products/actions.ts` — the helpers take
// `accessToken` as a parameter so tests can call them directly with a
// controlled token without mocking `next/headers`. `revalidatePath` is
// wrapped in its own try-catch (best-effort) so a revalidation failure
// never downgrades a successful save to an error toast (see
// `materials/pc/actions.ts` for the same reasoning).

export type CategoryActionResult =
  | { status: "success"; category: Category }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

type CategoryActionFailure = Exclude<CategoryActionResult, { status: "success" }>;

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): CategoryActionFailure {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return {
        status: "conflict",
        message: "ข้อมูลหมวดหมู่นี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
      };
    }
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
  return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
}

function revalidateCategoriesPath() {
  revalidatePath("/master-data/categories");
}

export async function performCreateCategory(
  accessToken: string,
  payload: CategoryPayload
): Promise<CategoryActionResult> {
  let category: Category;
  try {
    category = await createCategory(accessToken, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateCategoriesPath(); } catch { /* best-effort */ }
  return { status: "success", category };
}

export async function performUpdateCategory(
  accessToken: string,
  id: string,
  payload: UpdateCategoryPayload
): Promise<CategoryActionResult> {
  let category: Category;
  try {
    category = await updateCategory(accessToken, id, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateCategoriesPath(); } catch { /* best-effort */ }
  return { status: "success", category };
}

export async function performDeactivateCategory(
  accessToken: string,
  id: string
): Promise<CategoryActionResult> {
  let category: Category;
  try {
    category = await deactivateCategory(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateCategoriesPath(); } catch { /* best-effort */ }
  return { status: "success", category };
}

export async function performRestoreCategory(
  accessToken: string,
  id: string
): Promise<CategoryActionResult> {
  let category: Category;
  try {
    category = await restoreCategory(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateCategoriesPath(); } catch { /* best-effort */ }
  return { status: "success", category };
}

export async function createCategoryAction(payload: CategoryPayload): Promise<CategoryActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performCreateCategory(accessToken, payload);
}

export async function updateCategoryAction(
  id: string,
  payload: UpdateCategoryPayload
): Promise<CategoryActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performUpdateCategory(accessToken, id, payload);
}

export async function deactivateCategoryAction(id: string): Promise<CategoryActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performDeactivateCategory(accessToken, id);
}

export async function restoreCategoryAction(id: string): Promise<CategoryActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performRestoreCategory(accessToken, id);
}
