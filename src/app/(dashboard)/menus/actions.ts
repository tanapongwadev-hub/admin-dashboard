"use server";

import { cookies } from "next/headers";
import { getManagementTree, reorderMenus, type ReorderMenuItem } from "@/lib/api/menus";
import { ApiError } from "@/lib/api/client";

export type SaveMenuOrderResult =
  | { status: "success"; version: string }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

export async function saveMenuOrderAction(
  version: string,
  items: ReorderMenuItem[]
): Promise<SaveMenuOrderResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return { status: "error", message: "Your session expired. Please sign in again." };
  }

  try {
    const result = await reorderMenus(accessToken, { version, items });
    return { status: "success", version: result.version };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return {
        status: "conflict",
        message: "Someone else changed the menu arrangement. Refresh to see the latest version before saving again.",
      };
    }
    if (err instanceof ApiError) {
      const body = err.body as { message?: string } | undefined;
      return { status: "error", message: body?.message ?? "Could not save the new menu order." };
    }
    return { status: "error", message: "Could not reach the server." };
  }
}

export type RefreshMenuTreeResult =
  | { status: "success"; version: string; menus: Awaited<ReturnType<typeof getManagementTree>>["menus"] }
  | { status: "error"; message: string };

export async function refreshMenuTreeAction(): Promise<RefreshMenuTreeResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return { status: "error", message: "Your session expired. Please sign in again." };
  }

  try {
    const tree = await getManagementTree(accessToken);
    return { status: "success", version: tree.version, menus: tree.menus };
  } catch {
    return { status: "error", message: "Could not reach the server." };
  }
}

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}
