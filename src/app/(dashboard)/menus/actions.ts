"use server";

import { cookies } from "next/headers";
import { getManagementTree, reorderMenus, type ReorderMenuItem } from "@/lib/api/menus";
import { ApiError } from "@/lib/api/client";

export type SaveMenuOrderResult =
  | { status: "success"; version: string }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

export type RefreshMenuTreeResult =
  | { status: "success"; version: string; menus: Awaited<ReturnType<typeof getManagementTree>>["menus"] }
  | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
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
