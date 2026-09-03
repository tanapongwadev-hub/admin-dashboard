"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createMaterial,
  updateMaterial,
  deactivateMaterial,
  restoreMaterial,
  type Material,
  type MaterialPayload,
  type UpdateMaterialPayload,
} from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";

export type MaterialActionResult =
  | { status: "success"; material: Material }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): MaterialActionResult {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return {
        status: "conflict",
        message: "This material was updated elsewhere. Refresh and try again.",
      };
    }
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { status: "error", message: message ?? "Something went wrong. Please try again." };
  }
  return { status: "error", message: "Could not reach the server." };
}

export async function createMaterialPcAction(payload: MaterialPayload): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "Your session expired. Please sign in again." };

  try {
    const material = await createMaterial(accessToken, { ...payload, type: "PC" });
    revalidatePath("/materials/pc");
    return { status: "success", material };
  } catch (err) {
    return errorResult(err);
  }
}

export async function updateMaterialPcAction(
  id: string,
  payload: UpdateMaterialPayload
): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "Your session expired. Please sign in again." };

  try {
    const material = await updateMaterial(accessToken, id, payload);
    revalidatePath("/materials/pc");
    return { status: "success", material };
  } catch (err) {
    return errorResult(err);
  }
}

export async function deactivateMaterialPcAction(id: string): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "Your session expired. Please sign in again." };

  try {
    const material = await deactivateMaterial(accessToken, id);
    revalidatePath("/materials/pc");
    return { status: "success", material };
  } catch (err) {
    return errorResult(err);
  }
}

export async function restoreMaterialPcAction(id: string): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "Your session expired. Please sign in again." };

  try {
    const material = await restoreMaterial(accessToken, id);
    revalidatePath("/materials/pc");
    return { status: "success", material };
  } catch (err) {
    return errorResult(err);
  }
}
