"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createMaterialModel,
  updateMaterialModel,
  deactivateMaterialModel,
  restoreMaterialModel,
  type MaterialModel,
  type MaterialModelPayload,
  type UpdateMaterialModelPayload,
} from "@/lib/api/material-models";
import { ApiError } from "@/lib/api/client";

// Server Actions for the `/master-data/material-models` admin page. Same
// `perform*` helper + thin cookie-reading public-wrapper pattern as
// `master-data/loading-points/actions.ts`,
// `master-data/delivery-types/actions.ts`, and
// `master-data/reject-reasons/actions.ts` — the helpers take
// `accessToken` as a parameter so tests can call them directly with a
// controlled token without mocking `next/headers`. `revalidatePath` is
// wrapped in its own try-catch (best-effort) so a revalidation failure
// never downgrades a successful save to an error toast (see
// `materials/pc/actions.ts` for the same reasoning).

export type MaterialModelActionResult =
  | { status: "success"; materialModel: MaterialModel }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

type MaterialModelActionFailure = Exclude<MaterialModelActionResult, { status: "success" }>;

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): MaterialModelActionFailure {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return {
        status: "conflict",
        message: "ข้อมูลรุ่นวัสดุนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
      };
    }
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
  return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
}

function revalidateMaterialModelsPath() {
  revalidatePath("/master-data/material-models");
}

export async function performCreateMaterialModel(
  accessToken: string,
  payload: MaterialModelPayload
): Promise<MaterialModelActionResult> {
  let materialModel: MaterialModel;
  try {
    materialModel = await createMaterialModel(accessToken, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateMaterialModelsPath(); } catch { /* best-effort */ }
  return { status: "success", materialModel };
}

export async function performUpdateMaterialModel(
  accessToken: string,
  id: string,
  payload: UpdateMaterialModelPayload
): Promise<MaterialModelActionResult> {
  let materialModel: MaterialModel;
  try {
    materialModel = await updateMaterialModel(accessToken, id, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateMaterialModelsPath(); } catch { /* best-effort */ }
  return { status: "success", materialModel };
}

export async function performDeactivateMaterialModel(
  accessToken: string,
  id: string
): Promise<MaterialModelActionResult> {
  let materialModel: MaterialModel;
  try {
    materialModel = await deactivateMaterialModel(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateMaterialModelsPath(); } catch { /* best-effort */ }
  return { status: "success", materialModel };
}

export async function performRestoreMaterialModel(
  accessToken: string,
  id: string
): Promise<MaterialModelActionResult> {
  let materialModel: MaterialModel;
  try {
    materialModel = await restoreMaterialModel(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateMaterialModelsPath(); } catch { /* best-effort */ }
  return { status: "success", materialModel };
}

export async function createMaterialModelAction(payload: MaterialModelPayload): Promise<MaterialModelActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performCreateMaterialModel(accessToken, payload);
}

export async function updateMaterialModelAction(
  id: string,
  payload: UpdateMaterialModelPayload
): Promise<MaterialModelActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performUpdateMaterialModel(accessToken, id, payload);
}

export async function deactivateMaterialModelAction(id: string): Promise<MaterialModelActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performDeactivateMaterialModel(accessToken, id);
}

export async function restoreMaterialModelAction(id: string): Promise<MaterialModelActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performRestoreMaterialModel(accessToken, id);
}
