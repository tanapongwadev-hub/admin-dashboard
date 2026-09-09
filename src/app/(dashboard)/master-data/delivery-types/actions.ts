"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createDeliveryType,
  updateDeliveryType,
  deactivateDeliveryType,
  restoreDeliveryType,
  type DeliveryType,
  type DeliveryTypePayload,
  type UpdateDeliveryTypePayload,
} from "@/lib/api/delivery-types";
import { ApiError } from "@/lib/api/client";

// Server Actions for the `/master-data/delivery-types` admin page. Same
// `perform*` helper + thin cookie-reading public-wrapper pattern as
// `master-data/loading-points/actions.ts` and
// `master-data/categories/actions.ts` — the helpers take `accessToken`
// as a parameter so tests can call them directly with a controlled token
// without mocking `next/headers`. `revalidatePath` is wrapped in its own
// try-catch (best-effort) so a revalidation failure never downgrades a
// successful save to an error toast (see `materials/pc/actions.ts` for
// the same reasoning).

export type DeliveryTypeActionResult =
  | { status: "success"; deliveryType: DeliveryType }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

type DeliveryTypeActionFailure = Exclude<DeliveryTypeActionResult, { status: "success" }>;

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): DeliveryTypeActionFailure {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return {
        status: "conflict",
        message: "ข้อมูลประเภทการจัดส่งนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
      };
    }
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
  return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
}

function revalidateDeliveryTypesPath() {
  revalidatePath("/master-data/delivery-types");
}

export async function performCreateDeliveryType(
  accessToken: string,
  payload: DeliveryTypePayload
): Promise<DeliveryTypeActionResult> {
  let deliveryType: DeliveryType;
  try {
    deliveryType = await createDeliveryType(accessToken, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateDeliveryTypesPath(); } catch { /* best-effort */ }
  return { status: "success", deliveryType };
}

export async function performUpdateDeliveryType(
  accessToken: string,
  id: string,
  payload: UpdateDeliveryTypePayload
): Promise<DeliveryTypeActionResult> {
  let deliveryType: DeliveryType;
  try {
    deliveryType = await updateDeliveryType(accessToken, id, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateDeliveryTypesPath(); } catch { /* best-effort */ }
  return { status: "success", deliveryType };
}

export async function performDeactivateDeliveryType(
  accessToken: string,
  id: string
): Promise<DeliveryTypeActionResult> {
  let deliveryType: DeliveryType;
  try {
    deliveryType = await deactivateDeliveryType(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateDeliveryTypesPath(); } catch { /* best-effort */ }
  return { status: "success", deliveryType };
}

export async function performRestoreDeliveryType(
  accessToken: string,
  id: string
): Promise<DeliveryTypeActionResult> {
  let deliveryType: DeliveryType;
  try {
    deliveryType = await restoreDeliveryType(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateDeliveryTypesPath(); } catch { /* best-effort */ }
  return { status: "success", deliveryType };
}

export async function createDeliveryTypeAction(payload: DeliveryTypePayload): Promise<DeliveryTypeActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performCreateDeliveryType(accessToken, payload);
}

export async function updateDeliveryTypeAction(
  id: string,
  payload: UpdateDeliveryTypePayload
): Promise<DeliveryTypeActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performUpdateDeliveryType(accessToken, id, payload);
}

export async function deactivateDeliveryTypeAction(id: string): Promise<DeliveryTypeActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performDeactivateDeliveryType(accessToken, id);
}

export async function restoreDeliveryTypeAction(id: string): Promise<DeliveryTypeActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performRestoreDeliveryType(accessToken, id);
}
