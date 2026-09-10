"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createMaterialsReceiving,
  confirmMaterialsReceiving,
  cancelMaterialsReceiving,
  deleteMaterialsReceiving,
  getSuppliersByMaterial,
  type MaterialReceiving,
  type MaterialReceivingLookup,
  type CreateMaterialsReceivingPayload,
} from "@/lib/api/materials-receiving";
import { ApiError } from "@/lib/api/client";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";

export type MaterialsReceivingActionResult =
  | { status: "success"; receiving: MaterialReceiving }
  | { status: "error"; message: string };

export type MaterialsReceivingVoidActionResult =
  | { status: "success" }
  | { status: "error"; message: string };

export type SuppliersByMaterialActionResult =
  | { status: "success"; suppliers: MaterialReceivingLookup[] }
  | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): { status: "error"; message: string } {
  // Session expired mid-action (401) --> sign the user out immediately
  // instead of showing a dead-end error toast. See lib/session-expiry.ts.
  redirectIfSessionExpired(err);
  if (err instanceof ApiError) {
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
  return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
}

function revalidateReceivingPath() {
  try {
    revalidatePath("/materials/materials-receiving");
  } catch {
    /* best-effort */
  }
}

// perform* helpers take the accessToken as a parameter (testable without
// mocking next/headers) — see AGENTS.md § Material Receiving and the same
// pattern already used by materials/pc's actions.ts.

export async function performCreateMaterialsReceiving(
  accessToken: string,
  payload: CreateMaterialsReceivingPayload
): Promise<MaterialsReceivingActionResult> {
  try {
    const receiving = await createMaterialsReceiving(accessToken, payload);
    revalidateReceivingPath();
    return { status: "success", receiving };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performConfirmMaterialsReceiving(
  accessToken: string,
  id: string
): Promise<MaterialsReceivingActionResult> {
  try {
    const receiving = await confirmMaterialsReceiving(accessToken, id);
    revalidateReceivingPath();
    return { status: "success", receiving };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performCancelMaterialsReceiving(
  accessToken: string,
  id: string,
  cancelReason: string
): Promise<MaterialsReceivingActionResult> {
  try {
    const receiving = await cancelMaterialsReceiving(accessToken, id, cancelReason);
    revalidateReceivingPath();
    return { status: "success", receiving };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performDeleteMaterialsReceiving(
  accessToken: string,
  id: string
): Promise<MaterialsReceivingVoidActionResult> {
  try {
    await deleteMaterialsReceiving(accessToken, id);
    revalidateReceivingPath();
    return { status: "success" };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performGetSuppliersByMaterial(
  accessToken: string,
  materialId: string
): Promise<SuppliersByMaterialActionResult> {
  try {
    const suppliers = await getSuppliersByMaterial(accessToken, materialId);
    return { status: "success", suppliers };
  } catch (err) {
    return errorResult(err);
  }
}

export async function createMaterialsReceivingAction(
  payload: CreateMaterialsReceivingPayload
): Promise<MaterialsReceivingActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performCreateMaterialsReceiving(accessToken, payload);
}

export async function confirmMaterialsReceivingAction(id: string): Promise<MaterialsReceivingActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performConfirmMaterialsReceiving(accessToken, id);
}

export async function cancelMaterialsReceivingAction(
  id: string,
  cancelReason: string
): Promise<MaterialsReceivingActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performCancelMaterialsReceiving(accessToken, id, cancelReason);
}

export async function deleteMaterialsReceivingAction(id: string): Promise<MaterialsReceivingVoidActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performDeleteMaterialsReceiving(accessToken, id);
}

export async function getSuppliersByMaterialAction(
  materialId: string
): Promise<SuppliersByMaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performGetSuppliersByMaterial(accessToken, materialId);
}
