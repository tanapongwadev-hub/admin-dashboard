"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createMenu,
  deleteMenu,
  getManagementTree,
  reorderMenus,
  updateMenu,
  type CreateMenuPayload,
  type ReorderMenuItem,
  type UpdateMenuPayload,
} from "@/lib/api/menus";
import { ApiError } from "@/lib/api/client";

export type SaveMenuOrderResult =
  | { status: "success"; version: string }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

export type RefreshMenuTreeResult =
  | { status: "success"; version: string; menus: Awaited<ReturnType<typeof getManagementTree>>["menus"] }
  | { status: "error"; message: string };

export type MenuMutationResult =
  | Extract<RefreshMenuTreeResult, { status: "success" }>
  | { status: "refresh_required"; message: string }
  | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const body = error.body as { message?: string | string[] } | undefined;
    const message = body?.message;
    if (Array.isArray(message)) return message.join(" · ");
    const translations: Record<string, string> = {
      "Cannot delete menu with child menus": "ยังลบเมนูที่มีเมนูย่อยไม่ได้ กรุณาย้ายหรือลบเมนูย่อยก่อน",
      "Cannot delete menu that still has permissions": "ยังลบเมนูที่มี permission ผูกอยู่ไม่ได้ กรุณาถอด permission ก่อน",
      "Menu not found": "ไม่พบเมนูนี้ อาจถูกลบไปแล้ว กรุณารีเฟรชหน้า",
      "Parent menu not found": "ไม่พบเมนูแม่ที่เลือก กรุณารีเฟรชแล้วลองอีกครั้ง",
    };
    return typeof message === "string" ? (translations[message] ?? message) : fallback;
  }
  return "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้";
}

async function refreshedSuccess(accessToken: string): Promise<MenuMutationResult> {
  try { revalidatePath("/menus"); } catch { /* best-effort */ }
  const refreshed = await performRefreshMenuTree(accessToken);
  if (refreshed.status === "success") return refreshed;
  return {
    status: "refresh_required",
    message: "บันทึกข้อมูลแล้ว แต่โหลดโครงสร้างล่าสุดไม่สำเร็จ กำลังรีเฟรชหน้า",
  };
}

// `perform*` helpers — the testable inner functions. The public `*Action`
// exports below are thin cookie-reading wrappers around them (same pattern
// as `materials/pc/actions.ts` and `products/actions.ts`). The helpers
// take the accessToken as a parameter so tests can call them directly
// with a controlled token without needing to mock `next/headers`.
export async function performSaveMenuOrder(
  accessToken: string,
  version: string,
  items: ReorderMenuItem[]
): Promise<SaveMenuOrderResult> {
  try {
    const result = await reorderMenus(accessToken, { version, items });
    return { status: "success", version: result.version };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return {
        status: "conflict",
        message: "มีคนอื่นเปลี่ยนแปลงลำดับเมนูไปแล้ว กรุณารีเฟรชเพื่อดูข้อมูลล่าสุดก่อนบันทึกอีกครั้ง",
      };
    }
    if (err instanceof ApiError) {
      const body = err.body as { message?: string } | undefined;
      return { status: "error", message: body?.message ?? "ไม่สามารถบันทึกลำดับเมนูใหม่ได้" };
    }
    return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
  }
}

export async function performRefreshMenuTree(
  accessToken: string
): Promise<RefreshMenuTreeResult> {
  try {
    const tree = await getManagementTree(accessToken);
    return { status: "success", version: tree.version, menus: tree.menus };
  } catch {
    return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
  }
}

export async function performCreateMenu(
  accessToken: string,
  payload: CreateMenuPayload
): Promise<MenuMutationResult> {
  try {
    await createMenu(accessToken, payload);
  } catch (error) {
    return { status: "error", message: errorMessage(error, "ไม่สามารถสร้างเมนูได้") };
  }
  return refreshedSuccess(accessToken);
}

export async function performUpdateMenu(
  accessToken: string,
  id: string,
  payload: UpdateMenuPayload
): Promise<MenuMutationResult> {
  try {
    await updateMenu(accessToken, id, payload);
  } catch (error) {
    return { status: "error", message: errorMessage(error, "ไม่สามารถอัปเดตเมนูได้") };
  }
  return refreshedSuccess(accessToken);
}

export async function performDeleteMenu(
  accessToken: string,
  id: string
): Promise<MenuMutationResult> {
  try {
    await deleteMenu(accessToken, id);
  } catch (error) {
    return { status: "error", message: errorMessage(error, "ไม่สามารถลบเมนูได้") };
  }
  return refreshedSuccess(accessToken);
}

export async function saveMenuOrderAction(
  version: string,
  items: ReorderMenuItem[]
): Promise<SaveMenuOrderResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  return performSaveMenuOrder(accessToken, version, items);
}

export async function refreshMenuTreeAction(): Promise<RefreshMenuTreeResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  return performRefreshMenuTree(accessToken);
}

export async function createMenuAction(payload: CreateMenuPayload): Promise<MenuMutationResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  return performCreateMenu(accessToken, payload);
}

export async function updateMenuAction(
  id: string,
  payload: UpdateMenuPayload
): Promise<MenuMutationResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  return performUpdateMenu(accessToken, id, payload);
}

export async function deleteMenuAction(id: string): Promise<MenuMutationResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  return performDeleteMenu(accessToken, id);
}
