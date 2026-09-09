"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createLoadingPoint,
  updateLoadingPoint,
  deactivateLoadingPoint,
  restoreLoadingPoint,
  type LoadingPoint,
  type LoadingPointPayload,
  type UpdateLoadingPointPayload,
} from "@/lib/api/loading-points";
import { ApiError } from "@/lib/api/client";

// Server Actions for the `/master-data/loading-points` admin page. Same
// `perform*` helper + thin cookie-reading public-wrapper pattern as
// `materials/pc/actions.ts` and `master-data/categories/actions.ts` —
// the helpers take `accessToken` as a parameter so tests can call them
// directly with a controlled token without mocking `next/headers`.
// `revalidatePath` is wrapped in its own try-catch (best-effort) so a
// revalidation failure never downgrades a successful save to an error
// toast (see `materials/pc/actions.ts` for the same reasoning).

export type LoadingPointActionResult =
  | { status: "success"; loadingPoint: LoadingPoint }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

type LoadingPointActionFailure = Exclude<LoadingPointActionResult, { status: "success" }>;

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): LoadingPointActionFailure {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return {
        status: "conflict",
        message: "ข้อมูลจุดขนถ่ายนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
      };
    }
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
  return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
}

function revalidateLoadingPointsPath() {
  revalidatePath("/master-data/loading-points");
}

export async function performCreateLoadingPoint(
  accessToken: string,
  payload: LoadingPointPayload
): Promise<LoadingPointActionResult> {
  let loadingPoint: LoadingPoint;
  try {
    loadingPoint = await createLoadingPoint(accessToken, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateLoadingPointsPath(); } catch { /* best-effort */ }
  return { status: "success", loadingPoint };
}

export async function performUpdateLoadingPoint(
  accessToken: string,
  id: string,
  payload: UpdateLoadingPointPayload
): Promise<LoadingPointActionResult> {
  let loadingPoint: LoadingPoint;
  try {
    loadingPoint = await updateLoadingPoint(accessToken, id, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateLoadingPointsPath(); } catch { /* best-effort */ }
  return { status: "success", loadingPoint };
}

export async function performDeactivateLoadingPoint(
  accessToken: string,
  id: string
): Promise<LoadingPointActionResult> {
  let loadingPoint: LoadingPoint;
  try {
    loadingPoint = await deactivateLoadingPoint(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateLoadingPointsPath(); } catch { /* best-effort */ }
  return { status: "success", loadingPoint };
}

export async function performRestoreLoadingPoint(
  accessToken: string,
  id: string
): Promise<LoadingPointActionResult> {
  let loadingPoint: LoadingPoint;
  try {
    loadingPoint = await restoreLoadingPoint(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateLoadingPointsPath(); } catch { /* best-effort */ }
  return { status: "success", loadingPoint };
}

export async function createLoadingPointAction(payload: LoadingPointPayload): Promise<LoadingPointActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performCreateLoadingPoint(accessToken, payload);
}

export async function updateLoadingPointAction(
  id: string,
  payload: UpdateLoadingPointPayload
): Promise<LoadingPointActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performUpdateLoadingPoint(accessToken, id, payload);
}

export async function deactivateLoadingPointAction(id: string): Promise<LoadingPointActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performDeactivateLoadingPoint(accessToken, id);
}

export async function restoreLoadingPointAction(id: string): Promise<LoadingPointActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performRestoreLoadingPoint(accessToken, id);
}
